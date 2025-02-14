import { userAppointmentService } from "../../services/userAppointmentService";
import { Context } from "../../types/context";
import { userService } from "../../services/userService";
import { appointmentUploadService } from "../../services/appointmentUploadService";


interface SimpleAppointment {
  ID: string | bigint;
  appointmentId: string;
  doctorImage: string | null;
  doctorName: string;
  chiefComplaint: string;
  selectDate: string;
}

interface SimpleAppointmentResponse {
  status: boolean;
  data: SimpleAppointment[] | null;
  message: string;
}

function mapSimpleAppointment(data: any): SimpleAppointment {
  return {
    ID: data.ID,
    appointmentId: ensureString(data.appointmentId) || '',
    doctorImage: ensureString(data.doctorImage),
    doctorName: ensureString(data.doctorName) || '',
    chiefComplaint: ensureString(data.chiefComplaint) || '',
    selectDate: ensureString(data.selectDate) || '',
  };
}



// Base interfaces
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

interface StandardResponse {
  status: boolean;
  data: any | null;
  message: string;
}

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

// Input Types
interface AppointmentCreateInput {
  doctorName: string;
  selectDate: string;
  hospitalName: string;
  chiefComplaint: string;
  patientName: string;
  remarks?: string;
  upload?: {
    uploadPrescription?: string;
    uploadReport?: string;
  };
}

// Combined types
type AppointmentType = BaseAppointment & UploadFields & MetadataFields;

// Response Types
interface UploadResult {
  success: boolean;
  message?: string;
  prescription?: {
    uploadPrescription: string;
  };
  report?: {
    uploadReport: string;
  };
}

interface AppointmentResponse {
  status: boolean;
  data: {
    ID: string | null;
    appointmentId: string | null;
    doctorName: string | null;
    selectDate: string | null;
    hospitalName: string | null;
    chiefComplaint: string | null;
    PatientName: string | null;
    vitals: string | null;
    remarks: string | null;
    uploadPrescription: string | null;
    uploadReport: string | null;
  } | null;
  message: string;
}

interface UserResponse {
  status: boolean;
  data: {
    user: User | null;
  };
  message: string;
}

interface AppointmentListResponse {
  status: boolean;
  data: AppointmentType[] | null;
  message: string;
}

interface CreateAppointmentResponse {
  status: boolean;
  data: {
    appointment: AppointmentType;
    uploads: Record<string, string | null>;
  } | null;
  message: string;
}

// Helper functions
function serializeBigInt(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  return value.toString();
}

function ensureString(value: any): string | null {
  if (value === undefined || value === null) return null;
  return String(value);
}

interface StandardResponse {
  status: boolean;
  data: any | null;
  message: string;
}

function formatDate(date: Date | string | null | undefined): string | null {
  if (!date) return null;
  try {
    return new Date(date).toISOString();
  } catch {
    return null;
  }
}

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
    appointmentId: ensureString(data.appointmentId) || '',
    doctorName: ensureString(data.doctorName) || '',
    selectDate: ensureString(data.selectDate) || '',
    hospitalName: ensureString(data.hospitalName) || '',
    chiefComplaint: ensureString(data.chiefComplaint) || '',
    patientName: ensureString(data.PatientName)|| undefined,
    remarks: ensureString(data.remarks),
    uploadPrescription: ensureString(data.prescription?.uploadPrescription),
    uploadReport: ensureString(data.report?.uploadReport),
    createdAt: data.createdAt ? new Date(data.createdAt) : undefined,
    updatedAt: data.updatedAt ? new Date(data.updatedAt) : undefined,
    createdById: serializeBigInt(data.createdById),
    updatedById: serializeBigInt(data.updatedById)
  };
}

async function getAuthenticatedUser(req: Context['req']): Promise<string> {
  const userId = req.user;
  if (!userId) throw new Error("User not authenticated");
  return userId;
}

// Main resolvers
export const userAppointmentResolvers:any = {
  Query: {
    me: async (_: unknown, __: unknown, { req }: Context): Promise<UserResponse> => {
      try {
        const userId = await getAuthenticatedUser(req);
        const user = await userService.getUserById(userId);
        return formatUserResponse(true, user, "User fetched successfully");
      } catch (error) {
        console.error("Error in me query:", error);
        return formatUserResponse(false, null, error instanceof Error ? error.message : 'An error occurred');
      }
    },

    getUserAppointment: async (
      _: unknown,
      { appointmentId }: { appointmentId: string },
      { req }: Context
    ): Promise<AppointmentResponse> => {
      try {
        await getAuthenticatedUser(req);
        console.log("Fetching appointment with ID:", appointmentId);
        
        const appointment = await userAppointmentService.getAppointmentByAppointmentId(appointmentId);
        console.log("Raw appointment data:", appointment);

        if (!appointment) {
          return {
            status: false,
            data: null,
            message: `No appointment found with ID: ${appointmentId}`
          };
        }

        const mappedData = {
          ID: ensureString(appointment.ID),
          appointmentId: ensureString(appointment.appointmentId),
          doctorName: ensureString(appointment.doctorName),
          selectDate: ensureString(appointment.selectDate),
          hospitalName: ensureString(appointment.hospitalName),
          chiefComplaint: ensureString(appointment.chiefComplaint),
          PatientName: ensureString(appointment.PatientName),
          vitals: ensureString(appointment.vitals),
          remarks: ensureString(appointment.remarks),
          uploadPrescription: ensureString(appointment.prescription?.uploadPrescription),
          uploadReport: ensureString(appointment.report?.uploadReport),
        };

        return {
          status: true,
          data: mappedData,
          message: "Appointment fetched successfully"
        };
      } catch (error) {
        console.error("Error fetching appointment:", error);
        return {
          status: false,
          data: null,
          message: error instanceof Error ? error.message : "Error fetching appointment"
        };
      }
    },
    getAllUserAppointments: async (
      _: unknown, 
      __: unknown, 
      { req }: Context
    ): Promise<SimpleAppointmentResponse> => {
      try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
          throw new Error('Authorization token is required');
        }
        
        const appointments = await userAppointmentService.getAllAppointments(token);
        
        if (!appointments) {
          return {
            status: true,
            data: [],
            message: "No appointments found"
          };
        }

        const mappedAppointments = appointments.map(mapSimpleAppointment);

        return {
          status: true,
          data: mappedAppointments,
          message: "Appointments fetched successfully"
        };

      } catch (error) {
        console.error("Error fetching all appointments:", error);
        return {
          status: false,
          data: null,
          message: error instanceof Error ? error.message : 'An error occurred'
        };
      }
    }
  },

  Mutation: {
    createUserAppointment: async (
      _: unknown,
      {
        doctorName,
        selectDate,
        hospitalName,
        chiefComplaint,
        patientName,
        vitals,
        remarks,
        uploadPrescription,
        uploadReport
      }: {
        doctorName: string;
        selectDate: string;
        hospitalName: string;
        chiefComplaint: string;
        patientName: string;
        vitals?: string;
        remarks?: string;
        uploadPrescription?: string;
        uploadReport?: string;
      },
      { req }: Context
    ): Promise<StandardResponse> => {
      // Debug logging
      console.log("Received appointment parameters:", {
        doctorName,
        selectDate,
        hospitalName,
        chiefComplaint,
        patientName,
        vitals,
        remarks,
        uploadPrescription,
        uploadReport
      });

      // Validate authorization token
      const token = req.headers.authorization?.split(" ")[1];
      if (!token) {
        return formatResponse(false, null, "Authentication token is required");
      }

      // Validate required fields
      const requiredFields = {
        doctorName,
        selectDate,
        hospitalName,
        chiefComplaint,
        patientName
      };

      const missingFields = Object.entries(requiredFields)
        .filter(([_, value]) => !value)
        .map(([key]) => key);

      if (missingFields.length > 0) {
        console.log("Missing required fields:", missingFields);
        return formatResponse(
          false,
          null,
          `Missing required fields: ${missingFields.join(', ')}`
        );
      }

      try {
        console.log("Creating appointment with params:", {
          doctorName,
          selectDate,
          hospitalName,
          chiefComplaint,
          patientName,
          remarks
        });

        const appointment = await userAppointmentService.createUserAppointment(
          doctorName,
          selectDate,
          hospitalName,
          chiefComplaint,
          patientName,
          remarks || "",
          token
        );

        console.log("Appointment created:", appointment);

        let mappedAppointment = mapAppointment(appointment);
        const uploadResults: Record<string, string | null> = {};

        // Handle uploads if provided
        const uploadTasks: Promise<UploadResult>[] = [];

        if (uploadPrescription) {
          uploadTasks.push(
            appointmentUploadService.uploadPrescription(
              uploadPrescription,
              appointment.appointmentId,
              token
            ).then(result => ({
              success: result.success,
              message: result.message,
              prescription: {
                uploadPrescription: result.uploadPrescription || ''
              }
            }))
          );
        }

        if (uploadReport) {
          uploadTasks.push(
            appointmentUploadService.uploadReport(
              uploadReport,
              appointment.appointmentId,
              token
            ).then(result => ({
              success: result.success,
              message: result.message,
              report: {
                uploadReport: result.uploadReport || ''
              }
            }))
          );
        }

        if (uploadTasks.length > 0) {
          try {
            const uploadResultsArray = await Promise.all(uploadTasks);
            console.log("Upload results:", uploadResultsArray);

            uploadResultsArray.forEach(result => {
              if (result.success) {
                if (result.prescription) {
                  uploadResults['prescription'] = result.prescription.uploadPrescription;
                  mappedAppointment.uploadPrescription = result.prescription.uploadPrescription;
                }
                if (result.report) {
                  uploadResults['report'] = result.report.uploadReport;
                  mappedAppointment.uploadReport = result.report.uploadReport;
                }
              }
            });
          } catch (uploadError) {
            console.error("Error during file upload:", uploadError);
            return formatResponse(
              true,
              {
                appointment: mappedAppointment,
                uploads: uploadResults,
              },
              "Appointment created successfully, but there were issues with file uploads"
            );
          }
        }

        return formatResponse(
          true,
          {
            appointment: mappedAppointment,
            uploads: uploadResults,
          },
          "Appointment created successfully"
        );
      } catch (error) {
        console.error("Error creating appointment:", error);
        return formatResponse(
          false,
          null,
          error instanceof Error
            ? `Error creating appointment: ${error.message}`
            : 'An unexpected error occurred while creating the appointment'
        );
      }
    }
  }
};
