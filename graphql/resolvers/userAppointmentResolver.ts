import { userAppointmentService } from "../../services/userAppointmentService";
import { Context } from "../../types/context";
import { userService } from "../../services/userService";
import { appointmentUploadService } from "../../services/appointmentUploadService";

interface BaseAppointment {
  appointmentId: string;
  doctorName: string;
  selectDate: string;
  hospitalName: string;
  chiefComplaint: string;
  patientName?: string;
  remarks: string | null;
}

interface UploadFields {
  uploadPrescription: string | null;
  uploadReport: string | null;
}

interface MetadataFields {
  createdAt?: Date;
  updatedAt?: Date;
  createdById?: string | bigint | null;
  updatedById?: string | bigint | null;
}

type AppointmentType = BaseAppointment & UploadFields & MetadataFields;

interface UploadResponse {
  success: boolean;
  message?: string;
  appointment?: AppointmentType;
  uploadPrescription?: string;
  uploadReport?: string;
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

function mapAppointment(data: any): AppointmentType {
  return {
    appointmentId: data.appointmentId,
    doctorName: data.doctorName,
    selectDate: data.selectDate,
    hospitalName: data.hospitalName || '',
    chiefComplaint: data.chiefComplaint,
    patientName: data.patientName,
    remarks: data.remarks || null,
    uploadPrescription: data.uploadPrescription || null,
    uploadReport: data.uploadReport || null,
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

export const userAppointmentResolvers = {
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

    getUserAppointment: async (_: unknown, { appointmentId }: { appointmentId: string }, { req }: Context) => {
      try {
        await getAuthenticatedUser(req);
        const appointment = await userAppointmentService.getAppointmentByAppointmentId(appointmentId);
        return formatResponse(true, mapAppointment(appointment), "Appointment fetched successfully");
      } catch (error) {
        return formatResponse(false, null, error instanceof Error ? error.message : 'An error occurred');
      }
    },

    getUserAppointments: async (_: unknown, __: unknown, { req }: Context) => {
      try {
        const userId = await getAuthenticatedUser(req);
        const appointments = await userAppointmentService.getUserAppointments(userId);
        const mappedAppointments = appointments.map(mapAppointment);
        return formatResponse(true, mappedAppointments, "Appointments fetched successfully");
      } catch (error) {
        return formatResponse(false, null, error instanceof Error ? error.message : 'An error occurred');
      }
    }
  },

  Mutation: {
    createUserAppointment: async (
      _: unknown,
      args: {
        doctorName: string;
        selectDate: string;
        hospitalName: string;
        chiefComplaint: string;
        patientName: string;
        remarks?: string;
        uploadPrescription?: string;
        uploadReport?: string;
      },
      { req }: Context
    ) => {
      const token = req.headers.authorization?.split(" ")[1];
      if (!token) {
        return formatResponse(false, null, "Authentication token is required");
      }

      try {
        const appointment = await userAppointmentService.createUserAppointment(
          args.doctorName,
          args.selectDate,
          args.hospitalName,
          args.chiefComplaint,
          args.patientName,
          args.remarks || "",
          token
        );

        let mappedAppointment = mapAppointment(appointment);
        const uploadResults: Record<string, string | null> = {};

        const uploadTasks: Promise<UploadResponse | null>[] = [];

        if (args.uploadPrescription) {
          uploadTasks.push(
            appointmentUploadService.uploadPrescription(
              args.uploadPrescription,
              appointment.appointmentId,
              token
            ).then(result => ({
              success: result.success,
              appointment: result.appointment || null,
              uploadPrescription: result.uploadPrescription || null,
            }) as UploadResponse)
          );
        }

        if (args.uploadReport) {
          uploadTasks.push(
            appointmentUploadService.uploadReport(
              args.uploadReport,
              appointment.appointmentId,
              token
            ).then(result => ({
              success: result.success,
              appointment: result.appointment || null,
              uploadReport: result.uploadReport || null,
            }) as UploadResponse)
          );
        }

        const uploadResultsArray = (await Promise.all(uploadTasks)).filter(Boolean) as UploadResponse[];

        uploadResultsArray.forEach(result => {
          if (result.success && result.appointment) {
            mappedAppointment = {
              ...mappedAppointment,
              ...mapAppointment(result.appointment)
            };
          }

          if (result.uploadPrescription) {
            uploadResults['prescription'] = result.uploadPrescription;
          }

          if (result.uploadReport) {
            uploadResults['report'] = result.uploadReport;
          }
        });

        return formatResponse(
          true,
          {
            appointment: mappedAppointment,
            uploads: uploadResults,
          },
          "Appointment created successfully"
        );
      } catch (error) {
        return formatResponse(false, null, error instanceof Error ? error.message : 'An error occurred');
      }
    }
  }
};