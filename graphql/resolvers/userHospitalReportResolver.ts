import { userHospitalReportService } from "../../services/userHospitalReportService";
import { Context } from "../../types/context";
import { hospitalReportUploadService } from "../../services/hospitalReportUploadService";
import { userService } from "../../services/userService";

// User interface
interface User {
  EmailID: string;
  Password: string;
  fullname: string;
  mobile_num: string;
  city: string | null;
  state: string | null;
  date_of_birth: Date | null;
  sex: string;
  UserType: string | null;
  profile_Picture: string | null;
}

// Hospital report interfaces
interface BaseHospitalReport {
  hospitalReportId: string;
  hospitalName: string;
  selectDate: string;
  doctorName: string;
  procedure: string;
  patientName: string;
  remarks: string | null;
  docType: string | null;
  uploadHospitalReport: string | null;
  createdById: string | null;
  updatedById: string | null;
  userId: string | null;
}

interface HospitalReportListItem {
  hospitalReportId: string;
  hospitalName: string;
  selectDate: string;
  procedure: string;
  hospitalImage: string | null;
  ID: string;
  report: {
    docType: string | null;
    hospitalReport: string | null;
  };
}

// Response types for different data structures
interface UserResponse {
  status: boolean;
  data: {
    user: User | null;
  };
  message: string;
}

interface HospitalReportResponse {
  status: boolean;
  data: {
    hospitalReport: Partial<BaseHospitalReport> | null;
  };
  message: string;
}

interface HospitalReportListResponse {
  status: boolean;
  data: {
    hospitalReports: HospitalReportListItem[];
  } | null;
  message: string;
}

// Type guard to check response types
function isHospitalReportList(
  data: any[]
): data is HospitalReportListItem[] {
  return Array.isArray(data) && data.length >= 0 && 'hospitalReportId' in (data[0] || {});
}

// Separate format response functions for different types
function formatUserResponse(
  status: boolean,
  user: User | null,
  message = ""
): UserResponse {
  return {
    status,
    data: { user },
    message
  };
}

function formatHospitalReportResponse(
  status: boolean,
  hospitalReport: Partial<BaseHospitalReport> | null,
  message = ""
): HospitalReportResponse {
  return {
    status,
    data: { hospitalReport },
    message
  };
}

function formatHospitalReportListResponse(
  status: boolean,
  hospitalReports: HospitalReportListItem[] | null,
  message = ""
): HospitalReportListResponse {
  return {
    status,
    data: hospitalReports ? { hospitalReports } : null,
    message
  };
}

async function getAuthenticatedUser(req: Context['req']): Promise<string> {
  const userId = req.user;
  if (!userId) throw new Error("User not authenticated");
  return userId;
}

export const userHospitalReportResolvers = {
  Query: {
    me: async (_: unknown, __: unknown, { req }: Context): Promise<UserResponse> => {
      try {
        const userId = await getAuthenticatedUser(req);
        const user = await userService.getUserById(userId);
        return formatUserResponse(true, user, "User fetched successfully");
      } catch (error) {
        console.error("Error in me query:", error);
        return formatUserResponse(
          false,
          null,
          error instanceof Error ? error.message : 'An error occurred'
        );
      }
    },

    getAllUserHospitalReports: async (_: unknown, __: unknown, { req }: Context): Promise<HospitalReportListResponse> => {
      try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
          throw new Error('Authorization token is required');
        }
        
        const hospitalReports = await userHospitalReportService.getAllUserHospitalReports(token);
        return formatHospitalReportListResponse(
          true,
          hospitalReports,
          "Hospital reports fetched successfully"
        );
      } catch (error) {
        console.error("Error fetching hospital reports:", error);
        return formatHospitalReportListResponse(
          false,
          null,
          error instanceof Error ? error.message : 'An error occurred'
        );
      }
    }
  },

  Mutation: {
    createUserHospitalReport: async (
      _: unknown,
      args: {
        hospitalName: string;
        selectDate: string;
        doctorName: string;
        procedure: string;
        patientName: string;
        remarks?: string;
        uploadHospitalReport?: string;
      },
      { req }: Context
    ): Promise<HospitalReportResponse> => {
      const token = req.headers.authorization?.split(" ")[1];
      if (!token) {
        return formatHospitalReportResponse(false, null, "Authentication token is required");
      }

      try {
        const hospitalReport = await userHospitalReportService.createUserHospitalReport(
          args.hospitalName,
          args.selectDate,
          args.doctorName,
          args.procedure,
          args.patientName,
          args.remarks || '',
          token
        );

        const baseResult: Partial<BaseHospitalReport> = {
          hospitalReportId: hospitalReport.hospitalReportId,
          hospitalName: hospitalReport.hospitalName,
          selectDate: hospitalReport.selectDate,
          doctorName: hospitalReport.doctorName,
          procedure: hospitalReport.procedure,
          patientName: hospitalReport.PatientName,
          remarks: hospitalReport.remarks,
          uploadHospitalReport: null,
          createdById: hospitalReport.createdById,
          updatedById: hospitalReport.updatedById,
          userId: hospitalReport.userId
        };

        if (args.uploadHospitalReport) {
          const uploadResult = await hospitalReportUploadService.uploadHospitalReports(
            args.uploadHospitalReport,
            hospitalReport.hospitalReportId,
            token
          );

          if (!uploadResult.success) {
            throw new Error(uploadResult.message || "Upload failed");
          }

          if (uploadResult.uploadHospitalReport) {
            baseResult.uploadHospitalReport = uploadResult.uploadHospitalReport;
          }
        }

        return formatHospitalReportResponse(
          true,
          baseResult,
          "Hospital report created successfully"
        );
      } catch (error) {
        return formatHospitalReportResponse(
          false,
          null,
          error instanceof Error ? error.message : 'An error occurred'
        );
      }
    }
  }
};