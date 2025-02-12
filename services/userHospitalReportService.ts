import prisma from "../models/prismaClient";
import { verifyToken } from "../utils/jwt";
import { UserHospitalReport, UserMaster } from "@prisma/client";

export const userHospitalReportService = {
  // Helper method to convert BigInt to string safely
  convertBigIntToString(value: bigint | null | undefined): string | null {
    return value ? value.toString() : null;
  },

  async generateHospitalReportId(mbid: string): Promise<string> {
    const reportCount = await prisma.userHospitalReport.count({
      where: {
        user: {
          MBID: mbid,
        },
      },
    });

    const reportNumber = (reportCount + 1).toString().padStart(4, "0");
    return `${mbid}HR${reportNumber}`;
  },

  async createUserHospitalReport(
    hospitalName: string,
    selectDate: string,
    doctorName: string,
    procedure: string,
    patientName: string,
    remarks: string,
 
    token: string
  ) {
    if (!token) {
      throw new Error("Token is required");
    }

    const decoded = verifyToken(token);
    if (!decoded?.userId) {
      throw new Error("Invalid token");
    }

    const userId = BigInt(decoded.userId);

    const user = await prisma.userMaster.findUnique({
      where: { ID: userId },
      include: { hospitalReports: true },
    });

    if (!user) {
      throw new Error("User not found");
    }

    const hospitalReportId = await this.generateHospitalReportId(user.MBID);

    const report = await prisma.userHospitalReport.create({
      data: {
        hospitalReportId,
        hospitalName,
        selectDate,
        doctorName,
        procedure,
        PatientName: patientName,
        remarks,
        userId,
        createdById: userId,
        updatedById: userId,
      },
      include: {
        user: true,
        createdBy: true,
        updatedBy: true,
      },
    });

    return this.serializeHospitalReport(report);
  },

  async getUserHospitalReports(userId: string) {
    const userBigInt = BigInt(userId);

    const reports = await prisma.userHospitalReport.findMany({
      where: {
        userId: userBigInt,
      },
      include: {
        user: true,
        createdBy: true,
        updatedBy: true,
      },
      orderBy: {
        createdOn: "desc",
      },
    });

    return reports.map(this.serializeHospitalReport);
  },

  async getHospitalReportById(hospitalReportId: string) {
    const report = await prisma.userHospitalReport.findUnique({
      where: {
        hospitalReportId,
      },
      include: {
        user: true,
        createdBy: true,
        updatedBy: true,
      },
    });

    if (!report) {
      throw new Error("Hospital report not found");
    }

    return this.serializeHospitalReport(report);
  },

  serializeHospitalReport(report: UserHospitalReport & { 
    user?: UserMaster | null, 
    createdBy?: UserMaster | null, 
    updatedBy?: UserMaster | null 
  }) {
    return {
      // Convert BigInt fields to strings
      userId: this.convertBigIntToString(report.userId),
      createdById: this.convertBigIntToString(report.createdById),
      updatedById: this.convertBigIntToString(report.updatedById),

      // Existing fields
      hospitalReportId: report.hospitalReportId,
      hospitalName: report.hospitalName,
      selectDate: report.selectDate,
      doctorName: report.doctorName,
      procedure: report.procedure,
      PatientName: report.PatientName,
      remarks: report.remarks,
      createdOn: report.createdOn,
      updatedOn: report.updatedOn,

      // Serialize related entities, converting their IDs to strings
      user: report.user ? {
        ...report.user,
        ID: this.convertBigIntToString(report.user.ID)
      } : null,
      createdBy: report.createdBy ? {
        ...report.createdBy,
        ID: this.convertBigIntToString(report.createdBy.ID)
      } : null,
      updatedBy: report.updatedBy ? {
        ...report.updatedBy,
        ID: this.convertBigIntToString(report.updatedBy.ID)
      } : null
    };
  },
};
