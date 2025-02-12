import { userHospitalReportService } from "../../services/userHospitalReportService";
import { Context } from "../../types/context";
import { hospitalReportUploadService } from "../../services/hospitalReportUploadService";

interface BaseHospitalReport {
  hospitalReportId: string;
  hospitalName: string;
  selectDate: string;
  doctorName: string;
  procedure: string;
  patientName: string;
  remarks: string | null;
  uploadHospitalReport: string | null;
  createdById: string | null;
  updatedById: string | null;
  userId: string | null;
}

interface StandardResponse {
  status: boolean;
  data: {
    hospitalReport: Partial<BaseHospitalReport>;
  } | null;
  message: string;
}

function formatResponse(
  status: boolean,
  data: Partial<BaseHospitalReport> | null = null,
  message = ""
): StandardResponse {
  return {
    status,
    data: data ? { hospitalReport: data } : null,
    message
  };
}

export const userHospitalReportResolvers = {
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
    ): Promise<StandardResponse> => {
      const token = req.headers.authorization?.split(" ")[1];
      if (!token) {
        return formatResponse(false,null, "Authentication token is required");
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

        return formatResponse(
          true,
          baseResult,
          "Hospital report created successfully"
        );
      } catch (error) {
        return formatResponse(
          false,
          null,
          error instanceof Error ? error.message : 'An error occurred'
        );
      }
    }
  }
};