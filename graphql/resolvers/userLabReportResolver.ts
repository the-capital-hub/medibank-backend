import { userLabReportService } from "../../services/userLabReportService";
import { Context } from "../../types/context";
import { userService } from "../../services/userService";
import { labReportUploadService } from "../../services/labReportUploadService";

interface BaseLabReport {
  labReportId: string;
  labReportType: string;
  selectDate: string;
  labName: string;
  doctorName: string;
  selectFamilyMember: string;
  uploadLabReport?: string | null;
}

interface MetadataFields {
  createdAt?: Date;
  updatedAt?: Date;
  createdById?: string | bigint | null;
  updatedById?: string | bigint | null;
}

type LabReportType = BaseLabReport & MetadataFields;

interface UploadResponse {
  success: boolean;
  message?: string;
  labReport?: LabReportType;
  uploadLabReport?: string;
}

function serializeBigInt(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  return value.toString();
}

function formatResponse<T>(status: boolean, data: T | null = null, message = "") {
  try {
    const serializedData = data ? JSON.parse(JSON.stringify(data, (_, value) =>
      typeof value === 'bigint' ? value.toString() : value
    )) : null;

    return { status, data: serializedData, message };
  } catch (error) {
    console.error('Error formatting response:', error);
    return { status: false, data: null, message: 'Error processing response' };
  }
}

function mapLabReport(data: any): LabReportType {
  return {
    labReportId: data.labReportId,
    labReportType: data.labReportType,
    selectDate: data.selectDate,
    labName: data.labName || '',
    doctorName: data.doctorName,
    selectFamilyMember: data.selectFamilyMember,
    uploadLabReport: data.uploadLabReport || null,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    createdById: serializeBigInt(data.createdById),
    updatedById: serializeBigInt(data.updatedById)
  };
}

async function getAuthenticatedUser(req: Context['req']): Promise<string> {
  const userId = req.user;
  if (!userId) throw new Error("User not authenticated");
  return userId;
}

export const userLabReportResolvers = {
  Query: {
    me: async (_: unknown, __: unknown, { req }: Context) => {
      try {
        const userId = await getAuthenticatedUser(req);
        const user = await userService.getUserById(userId);
        return formatResponse(true, user, "User fetched successfully");
      } catch (error) {
        return formatResponse(false, null, error instanceof Error ? error.message : 'An error occurred');
      }
    },
      getAllUserLabReports: async (_: unknown, __: unknown, { req }: Context) => {
          try {
            const token = req.headers.authorization?.replace('Bearer ', '');
            if (!token) {
              throw new Error('Authorization token is required');
            }
            
            const labReports = await userLabReportService.getUserLabReports(token);
            return formatResponse(true, labReports, "Appointments fetched successfully");
          } catch (error) {
            console.error("Error fetching all appointments:", error);
            return formatResponse(false, null, error instanceof Error ? error.message : 'An error occurred');
          }
        }
      },
  


  Mutation: {
    createUserLabReport: async (
      _: unknown,
      args: {
        labReportType: string;
        selectDate: string;
        labName: string;
        doctorName: string;
        selectFamilyMember: string;
        uploadLabReport?: string;
      },
      { req }: Context
    ) => {
      const token = req.headers.authorization?.split(" ")[1];
      if (!token) {
        return formatResponse(false, null, "Authentication token is required");
      }

      try {
        const labReport = await userLabReportService.createUserLabReport(
          args.labReportType,
          args.selectDate,
          args.labName,
          args.doctorName,
          args.selectFamilyMember,
          token
        );

        let mappedLabReport = mapLabReport(labReport);

        if (args.uploadLabReport) {
          const uploadResult = await labReportUploadService.uploadLabReports(
            args.uploadLabReport,
            labReport.labReportId,
            token
          );

          if (!uploadResult.success) {
            throw new Error(uploadResult.message || "Upload failed");
          }

          if (uploadResult.labReport) {
            mappedLabReport = mapLabReport(uploadResult.labReport);
          }

          if (!uploadResult.uploadLabReport) {
            throw new Error("Upload failed - No URL returned");
          }
        }

        return formatResponse(
          true,
          {
            labReport: mappedLabReport,
          },
          "Lab report created successfully"
        );
      } catch (error) {
        return formatResponse(false, null, error instanceof Error ? error.message : 'An error occurred');
      }
    }
  }
};