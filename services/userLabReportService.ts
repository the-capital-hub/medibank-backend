import prisma from "../models/prismaClient";
import { verifyToken } from "../utils/jwt";
import { UserLabReport, UserMaster } from "@prisma/client";

const defaultDocPic = "https://shorturl.at/bp1wb";

export const userLabReportService = {
  // Helper method to convert BigInt to string safely
  convertBigIntToString(value: bigint | null | undefined): string | null {
    return value ? value.toString() : null;
  },

  async generateLabReportId(mbid: string): Promise<string> {
    const labReportCount = await prisma.userLabReport.count({
      where: {
        user: {
          MBID: mbid,
        },
      },
    });

    const labReportNumber = (labReportCount + 1)
      .toString()
      .padStart(4, "0");
    return `${mbid}LR${labReportNumber}`;
  },

  async createUserLabReport(
    labReportType: string,
    selectDate: string,
    labName: string,
    doctorName: string,
    selectFamilyMember: string,
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
      include: { labReports: true },
    });

    if (!user) {
      throw new Error("User not found");
    }

    const labReportId = await this.generateLabReportId(user.MBID);

    const labReport = await prisma.userLabReport.create({
      data: {
        labReportId,
        labReportType,
        selectDate,
        labName,
        doctorName,
        selectFamilyMember,
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

    return this.serializeLabReport(labReport);
  },

  async getUserLabReports(token: string) {
    if (!token) {
      throw new Error("Token is required");
    }
  
    const decoded = verifyToken(token);
    if (!decoded?.userId) {
      throw new Error("Invalid token");
    }
  
    const userId = BigInt(decoded.userId);
  
    const labReports = await prisma.userLabReport.findMany({
      where: {
        userId: userId,
      },
      select: {
        ID: true,
        labReportId: true,
        labImage: true,
        labName: true,
        labReportType: true,
        selectDate: true,
        docType: true, // Ensure this exists in your Prisma schema
        uploadLabReport: true, // Ensure this exists in your Prisma schema
      },
      orderBy: {
        createdOn: 'desc',
      },
    });
  
    return labReports.map(({ ID, docType, uploadLabReport, ...labReportData }) => ({
      ID: ID.toString(),
      ...labReportData,
      report: {
        docType: docType || null,
        labReport: uploadLabReport || null,
      },
    }));
  },
  
  async getLabReportByLabReportId(labReportId: string) {
    const labReport = await prisma.userLabReport.findUnique({
      where: {
        labReportId,
      },
      include: {
        user: true,
        createdBy: true,
        updatedBy: true,
      },
    });

    if (!labReport) {
      throw new Error("Lab report not found");
    }

    return this.serializeLabReport(labReport);
  },

  serializeLabReport(labReport: UserLabReport & {
    user?: UserMaster | null,
    createdBy?: UserMaster | null,
    updatedBy?: UserMaster | null
  }) {
    return {
      // Convert BigInt fields to strings
      userId: this.convertBigIntToString(labReport.userId),
      createdById: this.convertBigIntToString(labReport.createdById),
      updatedById: this.convertBigIntToString(labReport.updatedById),

      // Existing fields
      labReportId: labReport.labReportId,
      labReportType: labReport.labReportType,
      selectDate: labReport.selectDate,
      labName: labReport.labName,
      doctorName: labReport.doctorName,
      selectFamilyMember: labReport.selectFamilyMember,
      createdOn: labReport.createdOn,
      updatedOn: labReport.updatedOn,

      // Serialize related entities, converting their IDs to strings
      user: labReport.user ? {
        ...labReport.user,
        ID: this.convertBigIntToString(labReport.user.ID)
      } : null,
      createdBy: labReport.createdBy ? {
        ...labReport.createdBy,
        ID: this.convertBigIntToString(labReport.createdBy.ID)
      } : null,
      updatedBy: labReport.updatedBy ? {
        ...labReport.updatedBy,
        ID: this.convertBigIntToString(labReport.updatedBy.ID)
      } : null
    };
  },
};
