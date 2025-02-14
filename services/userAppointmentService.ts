import prisma from "../models/prismaClient";
import { verifyToken } from "../utils/jwt";
import { UserAppointment, UserMaster } from "@prisma/client";

const defaultDocPic = "https://shorturl.at/bp1wb";
const defaultPatientPic = "https://shorturl.at/n5anT";

interface AppointmentResponse {
  ID: string;
  appointmentId: string;
  doctorName: string;
  doctorImage: string | null;
  chiefComplaint: string;
  selectDate: string;
  remarks: string|null;
  vitals: string | null;
  hospitalName: string;
  PatientName: string;
  userId: string | null;
  prescription: {
    prescriptionDocType: string | null;
    uploadPrescription: string | null;
  };
  report: {
    reportDocType: string | null;
    uploadReport: string | null;
  };
}

export const userAppointmentService = {
  convertBigIntToString(value: bigint | null | undefined): string | null {
    return value ? value.toString() : null;
  },

  async getDefaultImage(userId: bigint): Promise<string> {
    const user = await prisma.userMaster.findUnique({
      where: { ID: userId },
      select: { UserType: true }
    });
    
    return user?.UserType === 'DOCTOR' ? defaultDocPic : defaultPatientPic;
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
    vitals: string,
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
    const defaultImage = await this.getDefaultImage(userId);

    const appointment = await prisma.userAppointment.create({
      data: {
        appointmentId,
        doctorImage: defaultImage,
        doctorName,
        selectDate,
        hospitalName,
        chiefComplaint,
        PatientName: patientName,
        remarks,
        vitals,
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

  async getAllAppointments(token: string) {
    if (!token) {
      throw new Error("Token is required");
    }

    const decoded = verifyToken(token);
    if (!decoded?.userId) {
      throw new Error("Invalid token");
    }

    const userId = BigInt(decoded.userId);

    const appointments = await prisma.userAppointment.findMany({
      where: {
        userId: userId,
      },
      select: {
        ID: true,
        appointmentId: true,
        doctorImage: true,
        doctorName: true,
        chiefComplaint: true,
        selectDate: true,
      },
      orderBy: {
        createdOn: 'desc',
      },
    });

    return appointments.map(appointment => ({
      ...appointment,
      ID: appointment.ID.toString()
    }));
  },

  async getAppointmentByAppointmentId(appointmentId: string): Promise<AppointmentResponse> {
    const appointment = await prisma.userAppointment.findUnique({
      where: {
        appointmentId,
      },
      select: {
        ID: true,
        appointmentId: true,
        doctorName: true,
        doctorImage: true,
        chiefComplaint: true,
        selectDate: true,
        remarks: true,
        vitals: true,
        prescriptionDocType: true,
        uploadPrescription: true,
        reportDocType: true,
        uploadReport: true,
        userId: true,
        hospitalName: true,
        PatientName: true,
      },
    });
  
    if (!appointment) {
      throw new Error("Appointment not found");
    }
  
    const {
      prescriptionDocType,
      uploadPrescription,
      reportDocType,
      uploadReport,
      ID,
      userId,
      ...basicAppointmentData
    } = appointment;
  
    return {
      ID: ID.toString(),
      ...basicAppointmentData,
      userId: userId ? userId.toString() : null,
      prescription: {
        prescriptionDocType: prescriptionDocType || null,
        uploadPrescription: uploadPrescription || null,
      },
      report: {
        reportDocType: reportDocType || null,
        uploadReport: uploadReport || null,
      }
    };
  },

  serializeAppointment(appointment: UserAppointment & { 
    user?: UserMaster | null, 
    createdBy?: UserMaster | null, 
    updatedBy?: UserMaster | null 
  }) {
    return {
      ID: appointment.ID.toString(),
      userId: this.convertBigIntToString(appointment.userId),
      createdById: this.convertBigIntToString(appointment.createdById),
      updatedById: this.convertBigIntToString(appointment.updatedById),
      doctorImage: appointment.doctorImage,
      appointmentId: appointment.appointmentId,
      doctorName: appointment.doctorName,
      chiefComplaint: appointment.chiefComplaint,
      selectDate: appointment.selectDate,
      hospitalName: appointment.hospitalName,
      PatientName: appointment.PatientName,
      vitals: appointment.vitals,
      remarks: appointment.remarks,
      createdOn: appointment.createdOn,
      updatedOn: appointment.updatedOn,
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