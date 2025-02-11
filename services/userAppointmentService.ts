import prisma from "../models/prismaClient";
import { verifyToken } from "../utils/jwt";
import { UserAppointment, UserMaster } from "@prisma/client";

const defaultDocPic = "https://shorturl.at/bp1wb";

export const userAppointmentService = {
  // Helper method to convert BigInt to string safely
   convertBigIntToString(value: bigint | null | undefined): string | null {
    return value ? value.toString() : null;
  },

  async generateAppointmentId(mbid: string): Promise<string> {
    const appointmentCount = await prisma.userAppointment.count({
      where: {
        user: {
          MBID: mbid,
        },
      },
    });

    const appointmentNumber = (appointmentCount + 1)
      .toString()
      .padStart(4, "0");
    return `${mbid}AP${appointmentNumber}`;
  },

  async createUserAppointment(
    doctorName: string,
    selectDate: string,
    hospitalName: string,
    chiefComplaint: string,
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
      include: { appointments: true },
    });

    if (!user) {
      throw new Error("User not found");
    }

    const appointmentId = await this.generateAppointmentId(user.MBID);

    const appointment = await prisma.userAppointment.create({
      data: {
        appointmentId,
        doctorImage: defaultDocPic,
        doctorName,
        selectDate,
        hospitalName,
        chiefComplaint,
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

    return this.serializeAppointment(appointment);
  },

  async getUserAppointments(userId: string) {
    const userBigInt = BigInt(userId);

    const appointments = await prisma.userAppointment.findMany({
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

    return appointments.map(this.serializeAppointment);
  },

  async getAppointmentByAppointmentId(appointmentId: string) {
    const appointment = await prisma.userAppointment.findUnique({
      where: {
        appointmentId,
      },
      include: {
        user: true,
        createdBy: true,
        updatedBy: true,
      },
    });

    if (!appointment) {
      throw new Error("Appointment not found");
    }

    return this.serializeAppointment(appointment);
  },

  serializeAppointment(appointment: UserAppointment & { 
    user?: UserMaster | null, 
    createdBy?: UserMaster | null, 
    updatedBy?: UserMaster | null 
  }) {
    return {
      // Convert BigInt fields to strings
      userId: this.convertBigIntToString(appointment.userId),
      createdById: this.convertBigIntToString(appointment.createdById),
      updatedById: this.convertBigIntToString(appointment.updatedById),

      // Existing fields
      doctorImage: appointment.doctorImage,
      appointmentId: appointment.appointmentId,
      doctorName: appointment.doctorName,
      chiefComplaint: appointment.chiefComplaint,
      selectDate: appointment.selectDate,
      hospitalName: appointment.hospitalName,
      PatientName: appointment.PatientName,
      remarks: appointment.remarks,
      createdOn: appointment.createdOn,
      updatedOn: appointment.updatedOn,

      // Serialize related entities, converting their IDs to strings
      user: appointment.user ? {
        ...appointment.user,
        ID: this.convertBigIntToString(appointment.user.ID)
      } : null,
      createdBy: appointment.createdBy ? {
        ...appointment.createdBy,
        ID: this.convertBigIntToString(appointment.createdBy.ID)
      } : null,
      updatedBy: appointment.updatedBy ? {
        ...appointment.updatedBy,
        ID: this.convertBigIntToString(appointment.updatedBy.ID)
      } : null
    };
  },
};