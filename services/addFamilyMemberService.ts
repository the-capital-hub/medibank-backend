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
    const memberCount = await prisma.addFamilyMember.count({
      where: {
        user: {
          MBID: mbid,
        },
      },
    });

    const memberNumber = (memberCount + 1).toString().padStart(4, "0");
    return `${mbid}FM${memberNumber}`;
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
            MBID: true
          }
        }
      }
    });

    return {
      familyMemberId: familyMember.familyMemberId,
      familyMemberName: familyMember.familyMemberName,
      familyMemberRelation: familyMember.familyMemberRelation,
      userMBID: familyMember.user.MBID
    };
  },

  async getAllFamilyMembers(token: string) {
    // Verify token and get user information
    const decodedToken = verifyToken(token);
    const userId = decodedToken.userId;
    
    if (!userId) {
      throw new Error("Invalid token");
    }

    const familyMembers = await prisma.addFamilyMember.findMany({
      where: {
        userId: BigInt(userId)
      },
      select: {
        familyMemberName: true,
        familyMemberRelation: true,
        MBID: true
      },
      orderBy: {
        createdOn: 'desc',
      },
    });

    return familyMembers.map(member => ({
      familyMemberName: member.familyMemberName,
      familyMemberRelation: member.familyMemberRelation,
      MBID: member.MBID
    }));
  }
};