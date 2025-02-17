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
    vitals: {
      bodyTemp: string | "";
      heartRate: string | "";
      respRate: string | "";
      bloodPres: string | "";
      spO2: string | "";
    }
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

interface ValidationResult {
  isValid: boolean;
  errors: string[];
}
function validateAppointmentInput(input: {
  doctorName: string;
  selectDate: string;
  hospitalName: string;
  chiefComplaint: string;
  patientName: string;
}): ValidationResult {
  const errors: string[] = [];
  
  // Check for empty or whitespace-only values
  if (!input.doctorName?.trim()) {
    errors.push("Doctor name is required");
  }
  
  if (!input.patientName?.trim()) {
    errors.push("Patient name is required");
  }
  
  if (!input.hospitalName?.trim()) {
    errors.push("Hospital name is required");
  }
  
  if (!input.chiefComplaint?.trim()) {
    errors.push("Chief complaint is required");
  }
  
  // Validate date format and value
  if (!input.selectDate) {
    errors.push("Date is required");
  } else {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(input.selectDate)) {
      errors.push("Invalid date format. Please use YYYY-MM-DD format");
    } else {
      const selectedDate = new Date(input.selectDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (isNaN(selectedDate.getTime())) {
        errors.push("Invalid date value");
      } else if (selectedDate < today) {
        errors.push("Appointment date cannot be in the past");
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

function formatResponse<T>(status: boolean, data: T | null = null, message = "") {
  try {
  
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
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
          throw new Error('Authorization token is required');
        }
        
        const appointment = await userAppointmentService.getAppointmentByAppointmentId(appointmentId, token);
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
            vitals: {
              bodyTemp: appointment.vitals.bodyTemp || "",
              heartRate: appointment.vitals.heartRate || "",
              respRate: appointment.vitals.respRate || "",
              bloodPres: appointment.vitals.bloodPres || "",
              spO2: appointment.vitals.spO2 || "",
            },
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
        bodyTemp,
        heartRate,
        respRate,
        bloodPres,
        spO2,
        remarks,
        uploadPrescription,
        uploadReport
      }: {
        doctorName: string;
        selectDate: string;
        hospitalName: string;
        chiefComplaint: string;
        patientName: string;
        bodyTemp?: string;
        heartRate?: string;
        respRate?: string;
        bloodPres?: string;
        spO2?: string;
        remarks?: string;
        uploadPrescription?: string;
        uploadReport?: string;
      },
      { req }: Context
    ): Promise<StandardResponse> => {
      try {
        // Validate authorization token
        const token = req.headers.authorization?.split(" ")[1];
        if (!token) {
          return formatResponse(false, null, "Authentication token is required");
        }

        // Validate required fields
        const validation = validateAppointmentInput({
          doctorName,
          selectDate,
          hospitalName,
          chiefComplaint,
          patientName
        });

        if (!validation.isValid) {
          return formatResponse(
            false,
            null,
            `Validation failed: ${validation.errors.join('; ')}`
          );
        }

        // Sanitize input by trimming whitespace
        const sanitizedInput = {
          doctorName: doctorName.trim(),
          selectDate,
          hospitalName: hospitalName.trim(),
          chiefComplaint: chiefComplaint.trim(),
          patientName: patientName.trim(),
          remarks: remarks?.trim() || "",
          bodyTemp: bodyTemp?.trim() || "",
          heartRate: heartRate?.trim() || "",
          respRate: respRate?.trim() || "",
          bloodPres: bloodPres?.trim() || "",
          spO2: spO2?.trim() || ""
        };

        const appointment = await userAppointmentService.createUserAppointment(
          sanitizedInput.doctorName,
          sanitizedInput.selectDate,
          sanitizedInput.hospitalName,
          sanitizedInput.chiefComplaint,
          sanitizedInput.patientName,
          sanitizedInput.remarks,
          sanitizedInput.bodyTemp,
          sanitizedInput.heartRate,
          sanitizedInput.respRate,
          sanitizedInput.bloodPres,
          sanitizedInput.spO2,
          token
        );

        let mappedAppointment = mapAppointment(appointment);
        const uploadResults: Record<string, string | null> = {};

        // Handle file uploads
        if (uploadPrescription || uploadReport) {
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

          try {
            const uploadResultsArray = await Promise.all(uploadTasks);
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

