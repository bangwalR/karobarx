import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { hasPermission } from "@/lib/permissions";

// POST - Change password
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || !hasPermission(session.user.role, "credentials", "write", session.user.permissions)) {
      return NextResponse.json(
        { success: false, error: "Only super admins can change login passwords" },
        { status: 403 }
      );
    }

    const { currentPassword, newPassword } = await request.json();
    
    // Get current password from environment or default
    const CURRENT_ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "mobilehub@123";
    
    // Verify current password
    if (currentPassword !== CURRENT_ADMIN_PASSWORD) {
      return NextResponse.json(
        { success: false, error: "Current password is incorrect" },
        { status: 400 }
      );
    }
    
    // Validate new password
    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json(
        { success: false, error: "New password must be at least 6 characters" },
        { status: 400 }
      );
    }
    
    // In a production app, you would update the password in a database
    // For this demo, we'll store it in a simple way
    // Note: In production, use proper password hashing and secure storage
    
    // For now, we'll return success and inform the user to update env variable
    return NextResponse.json({
      success: true,
      message: "Password validation successful. To permanently change the password, update the NEXT_PUBLIC_ADMIN_PASSWORD environment variable.",
      // In a real app, the password would be stored securely in the database
    });
  } catch (error) {
    console.error("Error changing password:", error);
    return NextResponse.json(
      { success: false, error: "Failed to change password" },
      { status: 500 }
    );
  }
}
