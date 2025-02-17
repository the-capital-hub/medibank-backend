import prisma from "../models/prismaClient";
import { verifyToken } from "../utils/jwt";
import { UserAppointment, UserMaster } from "@prisma/client";

const defaultDocPic = "https://profilepic-medibank.s3.ap-south-1.amazonaws.com/Misc/doc%20default.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=ASIA2OAJUCQXPAVM2ETI%2F20250217%2Fap-south-1%2Fs3%2Faws4_request&X-Amz-Date=20250217T113612Z&X-Amz-Expires=300&X-Amz-Security-Token=IQoJb3JpZ2luX2VjEEwaCmFwLXNvdXRoLTEiSDBGAiEAnu35oCgiHp2ixQTmUV6iLiAYEBUBivgYwpouhWeIrykCIQDAu6U2dQn%2Faj2v3Cv6ebzIeaVqVmvytBBvy%2BmkYX%2BsLirsAgh1EAAaDDcxNzI3OTcyODY4NiIM19eK57%2ByAcpEoPb9KskCpq0iyRv0dTjrwdumiebJ6F%2BBsNM9ccyiCLdhLosE3fmT%2FZU1xjDXNW%2FnX4h%2BWbKv5yItR0lueas82O7j6%2BTEdpDzx7T%2F2YN1UBR0mj4jLpTvXhw8jVjWltdixs7OaMkgBHvWJCMewWGy2RCV4tb%2Bc4DFtr7UP7XDAJcRetMwFJWDIlkZpYkfZiiOimb6fe4%2FOdhS8LuKD8wrOZTqDRGBFpvLNZG46Ux08ztjRCQlv6EyAoRVHIXFXe7myeMsM5Uy7W%2BTaul6EJ0uITFkuoTIMpzTWYlJuHYM4yApdj93YF%2Bof7Lwuo1c0DNdke7YjFAsXwQT6PQJ2fjO6r%2BeaIQ2DCdeeU6HyhcFFHk1QLtS3MUKQJakjks2t6rze5NjFZ%2FZZDtGZLisaNHy1x0PQMzHRKfNBr%2BDGQyz3EzRGKOwYDMKDmbGP7cPOiQwpPTLvQY6sgIJ%2FN7C5Cg4eJYD%2F3CNRye2Woc7EP%2BUHZ%2FGiimZ7rUM1mLWqub9CavinzdhF8Awxvzek0DU9pFSyQVZLpWQmtSwdUThnyiPwEMRE1whzLQ38UsipNTP5hRRX%2BXu%2BE4QA9qzrQY0A7pESoFDm0K7zCtKRRVd%2FWJWPtl3NgRzpg5sFfiiGfrhfXTsfyjpteuXUAbg%2BvmH0iqgVkWO2xyIka%2BQdMGALp%2Fr666%2BpBbLa%2BHAcijzHaOyjqORkCgO0ezyL%2F6YpL9%2FivVgWTyEJX%2FypmBAGrBSOxz3aUx2UdELbV34elAZpyC5o0CJNtAgP75RKXnJ4%2FM26z%2FwW%2BLUebYrN812XBMzcsJbMrNx3ueveb9Zvg9aCR4KuPLJxOqERHLcsQ7ADE1b6NqdZ5TGoXCiuIvqCLQ%3D&X-Amz-Signature=6d07eee4a6a961053c7ad046c734267087fe3432f6e1d8ebd9a38b3dd9c022dc&X-Amz-SignedHeaders=host&response-content-disposition=inline";


interface AppointmentResponse {
  ID: string;
  appointmentId: string;
  doctorName: string;
  doctorImage: string | null;
  chiefComplaint: string;
  selectDate: string;
  remarks: string|null;
  vitals: {
    bodyTemp: string|"";
    heartRate: string|"";
    respRate: string|"";
    bloodPres: string|"";
    spO2: string|"";

  }
  userType: string |null;
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
    bodyTemp: string,
    heartRate: string,
    respRate: string,
    bloodPres: string,
    spO2: string,
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
        bodyTemp,
        heartRate,
        respRate,
        bloodPres,
        spO2,
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
    const user = await prisma.userMaster.findUnique({
      where: { ID: userId },
      select: { UserType: true }
    });
  
      
    if (!user) {
      throw new Error("User not found");
    }
  
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
    const userType = user.UserType ?? "UNKNOWN";
  
    return appointments.map(appointment => {
      // Format the date to MMM-DD,YYYY (e.g., Oct-25,2024)
      let formattedDate = appointment.selectDate;
      
      try {
        if (appointment.selectDate) {
          const date = new Date(appointment.selectDate);
          
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
        console.error(`Error formatting date for appointment ${appointment.appointmentId}:`, error);
        // Keep the original date if there's an error
      }
      
      return {
        ...appointment,
        ID: appointment.ID.toString(),
        selectDate: formattedDate,
        userType: userType
      };
    });
  },

  async getAppointmentByAppointmentId(appointmentId: string, token: string): Promise<AppointmentResponse> {
    const decodedToken = verifyToken(token);
    if (!decodedToken?.userId) {
      throw new Error("Invalid token");
    }
    const authenticatedUserId = BigInt(decodedToken.userId);
    const user = await prisma.userMaster.findUnique({
      where: { ID: authenticatedUserId },
      select: { UserType: true }
    });
  
      
    if (!user) {
      throw new Error("User not found");
    }
   
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
        bodyTemp: true,
        heartRate: true,
        respRate: true,
        bloodPres: true,
        spO2: true,
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
    if (appointment.userId !== authenticatedUserId) {
      throw new Error("Unauthorized access to appointment");
    }
  
    // Format the selectDate if it exists
    let formattedDate = appointment.selectDate;
    try {
      if (appointment.selectDate) {
        const date = new Date(appointment.selectDate);
        
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
      console.error(`Error formatting date for appointment ${appointmentId}:`, error);
      // Keep the original date if there's an error
    }
  
    const {
      bodyTemp,
      heartRate,
      respRate,
      bloodPres,
      spO2,
      prescriptionDocType,
      uploadPrescription,
      reportDocType,
      uploadReport,
      ID,
      userId,
      selectDate,  // Destructure the original selectDate
      ...basicAppointmentData
    } = appointment;
  
    return {
      ID: ID.toString(),
      ...basicAppointmentData,
      selectDate: formattedDate,  // Use the formatted date
      userId: userId ? userId.toString() : null,
      userType: user.UserType,
      vitals: {
        bodyTemp: bodyTemp || '',
        heartRate: heartRate || '',
        respRate: respRate || '',
        bloodPres: bloodPres || '',
        spO2: spO2 || '',
      },
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
      bodyTemp: appointment.bodyTemp,
      heartRate: appointment.heartRate,
      respRate: appointment.respRate,
      bloodPres: appointment.bloodPres,
      spO2: appointment.spO2,
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