import prisma from "../models/prismaClient";
import { Prisma } from "@prisma/client";


// Doctor service response
interface DoctorServiceResponse {
    success: boolean;
    error?: string;
    data?: any;
  }
// Assuming UserType is defined in your schema
enum UserType {
  DOCTOR = 'doctor'
}

export const doctorService = {
  async doctorDetails(userId: string, token: string) {
    try {
      const userIdBigInt = BigInt(userId);
      
      // First check if user is a doctor
      const user = await prisma.userMaster.findFirst({
        where: {
          ID: userIdBigInt
        }
      });

      if (!user || user.UserType !== UserType.DOCTOR) {
        return { success: false, error: "User is not a doctor" };
      }

      const details = await prisma.doctorDetails.findFirst({
        where: {
          userId: userIdBigInt
        }
      });
      return { success: true, data: details };
    } catch (error) {
      return { success: false, error: "Failed to fetch doctor details" };
    }
  },

  async createDoctorDetails( 
    licenseRegistrationNo: string,
    qualification: string,
    collegeName: string,
    courseYear: string,
    city: string,
    state: string,
    userId: string,
    createdById: string
  ): Promise<DoctorServiceResponse> {
    if(!licenseRegistrationNo || !qualification || !collegeName || !courseYear ) {
        return { success: false, error: "Missing required fields" };
    }
    try {
      // Check if user is a doctor
      const user = await prisma.userMaster.findFirst({
        where: {
          ID: BigInt(userId)
        }
      });
  
      if (!user || user.UserType !== UserType.DOCTOR) {
        return { success: false, error: "User is not a doctor" };
      }
  
      const doctorDetails = await prisma.doctorDetails.create({
        data: {
          licenseRegistrationNo: licenseRegistrationNo,
          qualification: qualification,
          collegeName: collegeName,
          courseYear: courseYear,
          city: city,
          state: state,
          userId: BigInt(userId),
          createdById: BigInt(createdById)
        }
      });
  
      return {
        success: true,
        data: {
          ID: doctorDetails.ID,
          licenseRegistrationNo: doctorDetails.licenseRegistrationNo,
          qualification: doctorDetails.qualification,
          collegeName: doctorDetails.collegeName,
          courseYear: doctorDetails.courseYear,
          city: doctorDetails.city,
          state: doctorDetails.state,
          userId: doctorDetails.userId,
          createdById: doctorDetails.createdById,
          updatedById: doctorDetails.updatedById ?? null
        }
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          return { success: false, error: "A doctor with this license number already exists" };
        }
      }
      return { success: false, error: "Failed to create doctor details" };
    }
  },
  

  async updateDoctorDetails(id: string, data: {
    licenseRegistrationNo?: string;
    qualification?: string;
    collegeName?: string;
    courseYear?: string;
    city?: string;
    state?: string;
    updatedById: string;
  }) {
    try {
      // First fetch the doctor details to get the userId
      const existingDetails = await prisma.doctorDetails.findUnique({
        where: {
          ID: BigInt(id)
        }
      });

      if (!existingDetails) {
        return { success: false, error: "Doctor details not found" };
      }

      // Check if user is a doctor
      const user = await prisma.userMaster.findFirst({
        where: {
          ID: existingDetails.userId
        }
      });

      if (!user || user.UserType !== UserType.DOCTOR) {
        return { success: false, error: "User is not a doctor" };
      }

      const doctorDetails = await prisma.doctorDetails.update({
        where: {
          ID: BigInt(id)
        },
        data: {
          ...data,
          updatedById: BigInt(data.updatedById)
        }
      });
      return { success: true, data: doctorDetails };
    } catch (error) {
      return { success: false, error: "Failed to update doctor details" };
    }
  },

  async deleteDoctorDetails(id: string) {
    try {
      // First fetch the doctor details to get the userId
      const existingDetails = await prisma.doctorDetails.findUnique({
        where: {
          ID: BigInt(id)
        }
      });

      if (!existingDetails) {
        return { success: false, error: "Doctor details not found" };
      }

      // Check if user is a doctor
      const user = await prisma.userMaster.findFirst({
        where: {
          ID: existingDetails.userId
        }
      });

      if (!user || user.UserType !== UserType.DOCTOR) {
        return { success: false, error: "User is not a doctor" };
      }

      await prisma.doctorDetails.delete({
        where: {
          ID: BigInt(id)
        }
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: "Failed to delete doctor details" };
    }
  },

  async getDoctorDetailsByLicense(licenseNumber: string) {
    try {
      const details = await prisma.doctorDetails.findFirst({
        where: {
          licenseRegistrationNo: licenseNumber
        },
        include: {
          user: true
        }
      });

      if (!details || details.user.UserType !== UserType.DOCTOR) {
        return { success: false, error: "Doctor not found" };
      }

      return { success: true, data: details };
    } catch (error) {
      return { success: false, error: "Failed to fetch doctor details" };
    }
  }
};