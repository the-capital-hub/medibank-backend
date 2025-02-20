import prisma from "../models/prismaClient";
import { verifyToken } from "../utils/jwt";
interface FamilyMemberResponse {
  familyMemberId: string;
  name: string;
  relationship: string;
  userMBID: string;
}

export const addFamilyMemberService = {
  async generateFamilyMemberId(mbid: string): Promise<string> {
    let memberCount = await prisma.addFamilyMember.count({
      where: {
        MBID: mbid,  // Filter by MBID only
      },
    });
  
    let familyMemberId;
    let isUnique = false;
  
    while (!isUnique) {
      memberCount++;  // Increment count
      const memberNumber = memberCount.toString().padStart(4, "0");
      familyMemberId = `${mbid}FM${memberNumber}`;
  
      // Check if this ID already exists
      const existingMember = await prisma.addFamilyMember.findUnique({
        where: { familyMemberId },
      });
  
      if (!existingMember) {
        isUnique = true;
      }
    }
  
    return familyMemberId || "";
  },

  async createFamilyMember(
    familyMemberName: string,
    familyMemberRelation: string,
    token: string,
    mbid: string
  ) {
    const decodedToken = verifyToken(token);
    const userId = decodedToken.userId;
    if (!userId) {
      throw new Error("User not found");
    }
  
    const user = await prisma.userMaster.findUnique({
      where: { MBID: mbid },
    });
  
    if (!user) {
      throw new Error("User not found");
    }
  
    try {
      const familyMemberId = await this.generateFamilyMemberId(mbid);
  
      const familyMember = await prisma.addFamilyMember.create({
        data: {
          familyMemberId,
          familyMemberName,
          familyMemberRelation,
          MBID: mbid,
          userId: user.ID,
          createdById: user.ID,
          updatedById: user.ID,
        },
        select: {
          familyMemberId: true,
          familyMemberName: true,
          familyMemberRelation: true,
          user: {
            select: {
              MBID: true,
            },
          },
        },
      });
  
      return {
        familyMemberId: familyMember.familyMemberId,
        familyMemberName: familyMember.familyMemberName,
        familyMemberRelation: familyMember.familyMemberRelation,
        userMBID: familyMember.user.MBID,
      };
    } catch (error: any) {
      if (error.code === "P2002") {
        throw new Error("Family member ID already exists. Try again.");
      }
      throw error;
    }
  },
  

  async getAllFamilyMembers(token: string) {
    // Verify token and get user information
    const decodedToken = verifyToken(token);
    const userId = decodedToken.userId;
  
    if (!userId) {
      throw new Error("Invalid token");
    }
  
    // Fetch family members
    const familyMembers = await prisma.addFamilyMember.findMany({
      where: {
        userId: BigInt(userId)
      },
      select: {
        familyMemberName: true,
        familyMemberRelation: true,
        MBID: true,
        familyMemberId: true
      },
      orderBy: {
        createdOn: 'desc',
      },
    });
  
    // Fetch profile pictures from userMaster using MBID
    return await Promise.all(
      familyMembers.map(async (member) => {
        const userProfile = await prisma.userMaster.findUnique({
          where: { MBID: member.MBID },
          select: { profile_Picture: true }, // Fetching profile picture
        });
  
        return {
          familyMemberName: member.familyMemberName,
          familyMemberRelation: member.familyMemberRelation,
          MBID: member.MBID,
          familyMemberId: member.familyMemberId,
          familyMemberImage: userProfile?.profile_Picture || "", // Default to null if no picture found
        };
      })
    );
  },
  async deleteFamilyMember(familyMemberId: string, token: string) {
    // Verify token and get user information
    const decodedToken = verifyToken(token);
    const userId = decodedToken.userId;

    if (!userId) {
      throw new Error("Invalid token");
    }

    try {
      // Delete the family member
      await prisma.addFamilyMember.delete({
        where: { familyMemberId },
      });

      // Re-fetch all family members after deletion
      const familyMembers = await prisma.addFamilyMember.findMany({
        where: {
          userId: BigInt(userId),
        },
        select: {
          familyMemberName: true,
          familyMemberRelation: true,
          MBID: true,
          familyMemberId: true,
        },
        orderBy: {
          createdOn: "desc",
        },
      });

      // Fetch profile pictures from userMaster using MBID
      return await Promise.all(
        familyMembers.map(async (member) => {
          const userProfile = await prisma.userMaster.findUnique({
            where: { MBID: member.MBID },
            select: { profile_Picture: true },
          });

          return {
            familyMemberName: member.familyMemberName,
            familyMemberRelation: member.familyMemberRelation,
            MBID: member.MBID,
            familyMemberId: member.familyMemberId,
            familyMemberImage: userProfile?.profile_Picture || "",
          };
        })
      );
    } catch (error) {
      throw new Error(`Failed to delete family member: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }
};