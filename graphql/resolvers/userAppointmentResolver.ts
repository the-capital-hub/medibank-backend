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
type AppointmentType = BaseAppointment & UploadFields ;

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
    vitals: string| "";
    remarks: string | "";
    prescription: {
      prescriptionDocType: string | "";
      uploadPrescription: string | "";
    };
    report: {
      reportDocType: string | "";
      uploadReport: string | ""
    };
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
    // First, let's log the incoming data
    console.log('formatResponse input:', { status, data, message });

    // Custom replacer function to handle BigInt and Date objects
    const replacer = (key: string, value: any) => {
      if (typeof value === 'bigint') {
        return value.toString();
      }
      if (value instanceof Date) {
        return value.toISOString();
      }
      // Handle undefined values
      if (value === undefined) {
        return null;
      }
      return value;
    };

    // First stringify with our custom replacer
    const stringifiedData = JSON.stringify(data, replacer);
    
    // Then parse it back to ensure it's valid JSON
    const serializedData = data ? JSON.parse(stringifiedData) : null;
    
    // Log the output before returning
    console.log('formatResponse output:', { status, serializedData, message });
    
    return { status, data: serializedData, message };
  } catch (error) {
    // Detailed error logging
    console.error('Error in formatResponse:', error);
    console.error('Failed to serialize data:', data);
    return { 
      status: false, 
      data: null, 
      message: error instanceof Error ? `Serialization error: ${error.message}` : 'Error processing response' 
    };
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
        
        const appointment = await userAppointmentService.getAppointmentByAppointmentId(appointmentId);
        console.log("Raw appointment data:", appointment);
    
        if (!appointment) {
          return {
            status: false,
            data: null,
            message: `No appointment found with ID: ${appointmentId}`
          };
        }
    
        // Create the response object EXACTLY as expected by GraphQL
        const response = {
          status: true,
          data: {
            ID: String(appointment.ID),
            appointmentId: appointment.appointmentId,
            doctorName: appointment.doctorName,
            selectDate: appointment.selectDate,
            hospitalName: appointment.hospitalName,
            chiefComplaint: appointment.chiefComplaint,
            PatientName: appointment.PatientName,
            vitals: appointment.vitals || "",
            remarks: appointment.remarks || "",
            prescription: {
            prescriptionDocType: appointment.prescription?.prescriptionDocType || "",
            uploadPrescription: appointment.prescription?.uploadPrescription || ""},
            report: {
            reportDocType: appointment.report?.reportDocType || "",
            uploadReport: appointment.report?.uploadReport || ""
            },
          },
          message: "Appointment fetched successfully"
        };
    
        // Debug log the final response
        console.log("Final response:", JSON.stringify(response, null, 2));
    
        return response;
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
          vitals || "",
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
