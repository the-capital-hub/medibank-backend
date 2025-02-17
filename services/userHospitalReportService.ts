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
  async getAllUserHospitalReports(token: string) {
    if (!token) {
      throw new Error("Token is required");
    }
  
    const decoded = verifyToken(token);
    if (!decoded?.userId) {
      throw new Error("Invalid token");
    }
  
    const userId = BigInt(decoded.userId);
  
    const hospitalReports = await prisma.userHospitalReport.findMany({
      where: {
        userId: userId,
      },
      select: {
        ID: true,
        hospitalReportId: true,
        hospitalImage: true,
        hospitalName: true,
        procedure: true,
        selectDate: true,
        docType: true,
        uploadHospitalReport: true,
      },
      orderBy: {
        createdOn: 'desc',
      },
    });
  
    return hospitalReports.map(({ ID, docType, uploadHospitalReport, selectDate, hospitalReportId, ...hospitalReportData }) => {
      // Format the date to MMM-DD,YYYY (e.g., Oct-25,2024)
      let formattedDate = selectDate;
      
      try {
        if (selectDate) {
          let date: Date;
          
          // Handle different date formats
          if (selectDate.match(/^\d{2}-\d{2}-\d{4}$/)) {
            // Format: DD-MM-YYYY
            const [day, month, year] = selectDate.split('-').map(Number);
            date = new Date(year, month - 1, day);
          } else if (selectDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
            // Format: YYYY-MM-DD
            date = new Date(selectDate);
          } else {
            // Try to parse using Date constructor
            date = new Date(selectDate);
          }
          
          // Check if date is valid
          if (!isNaN(date.getTime())) {
            // Get month abbreviation (first 3 letters)
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                             'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const month = monthNames[date.getMonth()];
            
            // Get day with leading zero if needed
            const day = date.getDate().toString().padStart(2, '0');
            
            // Get full year
            const year = date.getFullYear();
            
            // Format as MMM-DD,YYYY
            formattedDate = `${month}-${day},${year}`;
          }
        }
      } catch (error) {
        console.error(`Error formatting date for hospital report ${hospitalReportId}:`, error);
        // Keep the original date if there's an error
      }
      
      return {
        ID: ID.toString(),
        hospitalReportId,
        ...hospitalReportData,
        selectDate: formattedDate,
        report: {
          docType: docType || null,
          hospitalReport: uploadHospitalReport || null,
        },
      };
    });
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
