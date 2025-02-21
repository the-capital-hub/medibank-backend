import prisma from "../models/prismaClient";

function sanitizeDoctorDetails(details: any) {
  if (!details) return null;
  
  return {
    ...details,
    ID: details.ID?.toString() || null,
    userId: details.userId?.toString() || null,
    createdById: details.createdById?.toString() || null,
    updatedById: details.updatedById?.toString() || null
  };
}

export const doctorService = {
  async createDoctorDetails(
    licenseRegistrationNo: string,
    qualifications: string,
    collegeName: string,
    courseYear: string,
    userId: string | bigint // Accept either string or bigint
  ) {
    try {
      // Ensure userId is BigInt
      const userIdBigInt = typeof userId === 'string' ? BigInt(userId) : userId;

      const doctorDetails = await prisma.doctorDetails.create({
        data: {
          licenseRegistrationNo,
          qualification: qualifications,
          collegeName,
          courseYear,
          userId: userIdBigInt,
          createdById: userIdBigInt
        },
        select: {
          ID: true,
          licenseRegistrationNo: true,
          qualification: true,
          collegeName: true,
          courseYear: true,
          userId: true,
          createdById: true,
          updatedById: true,
          createdOn: true,
          updatedOn: true
        }
      });

      return sanitizeDoctorDetails(doctorDetails);

    } catch (error: any) {
      console.error("Error in createDoctorDetails:", error);
      if (error.code === 'P2002') {
        throw new Error("A doctor with this license number or email already exists");
      }
      throw new Error(error.message || "Failed to create doctor details");
    }
  }
};