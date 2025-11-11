"use client";

import { useState, useEffect } from "react";
import { useFormik } from "formik";
import * as yup from "yup";
import Image from "next/image";
import axios from "axios";
import Container from "@mui/material/Container";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Link from "@mui/material/Link";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Grid from "@mui/material/Grid";
import {
  authenticateStudent,
  adminLogin,
  getToken,
} from "@/lib/db";
import { useRouter } from "next/navigation";

interface StudentPortalSession {
  token: string;
  studentId: string;
  studentName?: string;
  email?: string;
}

type AtenxionCredentials = {
  userId: string | number;
  studentId?: string;
  // studentName?: string;
  agentId?: string;
  agentchainId?: string;
};

type AtenxionRequestBody = {
  userId: string;
  // studentName: string;
  studentId: string;
  agentId?: string;
  // agentchainId?: string;
  Authorization?: string;
};

function resolveServerUrl(): string {
  return 'https://api-qa.atenxion.ai';
  // return "http://localhost:8000";
}

function normalizeCredentials(
  credentials: AtenxionCredentials
): AtenxionRequestBody {
  const userId = (credentials.studentId?.toString().trim() || credentials.userId.toString().trim()) || "";
  const agentId = credentials.agentId?.trim();
  const agentchainId = credentials.agentchainId?.trim();
  const studentId = credentials.studentId?.trim() || userId;

  let studentToken = "";
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem("student_portal");
    if (stored) {
      try {
        studentToken = JSON.parse(stored).token || "";
      } catch (e) {
        // Ignore parse errors
      }
    }
  }

  const body: AtenxionRequestBody = {
    userId,
    studentId,
    agentId,
    // agentchainId,
    Authorization: `Bearer ${studentToken}`,
  };

  if (agentId) {
    body.agentId = agentId;
  }

  if (agentchainId) {
    body.agentId = agentchainId;
  }

  return body;
}

function handleAxiosError(error: any, defaultMessage: string): boolean {
  if (error.response) {
    console.error('Atenxion login failed:', {
      status: error.response.status,
      statusText: error.response.statusText,
      data: error.response.data,
      url: error.config?.url
    });
  } else if (error.request) {
    console.error('Atenxion login failed - no response:', error.request);
  } else {
    console.error('Atenxion login failed:', error.message);
  }
  return false;
}

function getHeaders(token?: string | null): { Authorization: string } {
  return { Authorization: token ? `${token}` : '' };
}

async function loginAtenxionUser(
  credentials: AtenxionCredentials,
  token?: string | null
): Promise<boolean> {
  const url = `${resolveServerUrl()}/api/post-login/user-login`;
  console.log("Atenxion login URL:", url);
  const resolvedToken =   (await getToken())?.token;
  
  const requestBody = normalizeCredentials(credentials);
  
  const headers = getHeaders(resolvedToken);

  console.log("Atenxion API call:", {
    url,
    body: requestBody,
    headers,
    token: resolvedToken ? resolvedToken.substring(0, 20) + "..." : "none",
  });

  try {
   const pp= await axios.post(url, requestBody, { headers });
   console.log("Atenxion login response:", pp);
    return true;
  } catch (error) {
    console.error("Atenxion login failed:", error);
    return handleAxiosError(error, "Unable to log in to Atenxion");
  }
}

export async function logoutAtenxionUser(
  credentials: AtenxionCredentials,
  token?: string | null
): Promise<boolean> {
  const url = `${resolveServerUrl()}/api/post-login/user-logout`;
  
  const resolvedToken = (await getToken())?.token || token;
  
  const body = normalizeCredentials(credentials);
  
  const headers = getHeaders(resolvedToken);

  try {
    console.log("Atenxion logout API call:", {
      url,
      body,
      headers,
      token: resolvedToken ? `${resolvedToken.substring(0, 16)}...` : "none",
    });
    await axios.post(url, body, { headers });
    return true;
  } catch (error) {
    console.error("Atenxion logout failed:", error);
    return handleAxiosError(error, "Unable to log out from Atenxion");
  }
}

type LoginMode = "student" | "staff";

const validationSchema = yup.object({
  email: yup
    .string()
    .email("Enter a valid email address")
    .required("Email is required"),
  password: yup
    .string()
    .min(6, "Password must be at least 6 characters")
    .required("Password is required"),
});

export default function LoginPageContent() {
  const [loginMode, setLoginMode] = useState<LoginMode>("student");
  const [tabValue, setTabValue] = useState(0);
  const [submitError, setSubmitError] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const [session, setSession] = useState<StudentPortalSession | null>(() => {
    // Load session from localStorage on mount
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('student_portal');
        if (stored) {
          return JSON.parse(stored) as StudentPortalSession;
        }
      } catch {
        // Ignore errors
      }
    }
    return null;
  });

  // Persist session to localStorage
  useEffect(() => {
    try {
      if (session) {
        localStorage.setItem('student_portal', JSON.stringify(session));
      } else {
        localStorage.removeItem('student_portal');
      }
    } catch {
      // Ignore localStorage errors
    }
  }, [session]);

  const formik = useFormik({
    initialValues: {
      email: "",
      password: "",
    },
    validationSchema: validationSchema,
    onSubmit: async (values) => {
      setIsSubmitting(true);
      setSubmitError("");

      try {
        if (loginMode === "student") {
          const authResult = await authenticateStudent(
            values.email.trim(),
            values.password
          );

          if (!authResult?.student?.id || !authResult?.accessToken) {
            setSubmitError("Invalid credentials or missing student profile.");
            setIsSubmitting(false);
            return;
          }

          const student = authResult.student;
          const accessToken = authResult.accessToken; // JWT token auto-generated by server
   console.log("Atenxion login response token :", accessToken);
          // Call external Atenxion API with widget login
          let tokenData: { token: string; iframe: string } | null = null;
          try {
            tokenData = await getToken();
            console.log("getToken() result:", tokenData ? "success" : "null");
            if (tokenData) {
              console.log("Token from MongoDB:", tokenData.token ? tokenData.token.substring(0, 20) + "..." : "missing");
              console.log("Iframe:", tokenData.iframe ? "present" : "missing");
            }
            
            const iframe = tokenData?.iframe;
            
            // Extract agentId and agentchainId from iframe if needed
            let agentId: string | undefined;
            let agentchainId: string | undefined;
            if (iframe) {
              const agentIdMatch = iframe.match(/agentId=([^&"']+)/);
              const agentchainIdMatch = iframe.match(/agentchainId=([^&"']+)/);
              agentId = agentIdMatch ? agentIdMatch[1] : undefined;
              agentchainId = agentchainIdMatch ? agentchainIdMatch[1] : undefined;
            }
            
            const fullName = `${student.firstName} ${student.lastName}`.trim();
            
            // Create and save student portal session to localStorage
            // Use accessToken (JWT) from server authentication
            const nextSession: StudentPortalSession = {
              token: accessToken, // JWT accessToken auto-generated by server
              studentId: student.id.toString(),
              studentName: fullName,
              email: values.email.trim(),
            };
            setSession(nextSession);
            
            // Immediately save to localStorage to ensure it's persisted before redirect
            if (typeof window !== 'undefined') {
              try {
                localStorage.setItem('student_portal', JSON.stringify(nextSession));
                console.log('Student portal session saved to localStorage:', {
                  studentId: nextSession.studentId,
                  studentName: nextSession.studentName,
                  email: nextSession.email
                });
              } catch (e) {
                console.error('Failed to save student portal session to localStorage:', e);
              }
            }
            
            // Login to widget with studentID
            // Pass MongoDB token (context key) to Atenxion API
            console.log("📞 Calling Atenxion API with student:", {
              userId: student.id,
              studentId: student.id.toString(),
              studentName: fullName,
              agentId: agentId || "none",
              agentchainId: agentchainId || "none",
              mongoToken: tokenData?.token ? tokenData.token.substring(0, 20) + "..." : "missing",
              jwtToken: accessToken ? accessToken.substring(0, 20) + "..." : "none"
            });
            
            // Only call Atenxion API if we have the MongoDB token
            if (tokenData?.token) {
              console.log("✅ MongoDB token found, calling Atenxion API...");
              try {
                // Make API call and wait for it to complete
                const apiResult = await loginAtenxionUser(
                  {
                    userId: student.id,
                    studentId: student.id.toString(),
                    agentId: agentId || undefined,
                    agentchainId: agentchainId || undefined
                  },
                  tokenData.token // Use MongoDB token (context key)
                );
                console.log("✅ Atenxion API call completed, result:", apiResult);
              } catch (apiError) {
                console.error('❌ Atenxion API call failed:', apiError);
                // Continue with login even if API call fails
              }
            } else {
              console.warn("⚠️ MongoDB token not found, skipping Atenxion API call");
              console.warn("⚠️ tokenData:", tokenData);
            }
          } catch (error) {
            // Log error but continue with login flow
            console.error('❌ Error in login flow:', error);
            if (error instanceof Error) {
              console.error('Error details:', error.message, error.stack);
            }
          }

          const fullName = [student.firstName, student.lastName]
            .filter(Boolean)
            .join(" ");
          const maxAgeSeconds = 60 * 60 * 24; // 24 hours

          // Set cookies for server-side access
          document.cookie = `brillar_student_id=${student.id}; path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax`;

          if (fullName) {
            document.cookie = `brillar_student_name=${encodeURIComponent(
              fullName
            )}; path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax`;
          }

          // Save accessToken (JWT) to cookie for server-side access
          // This is the token auto-generated by the server during authentication
          document.cookie = `student_portal_token=${accessToken}; path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax`;
          console.log('Student portal accessToken cookie set (JWT from server):', accessToken.substring(0, 20) + '...');
          
          // Note: MongoDB token is not saved to cookies, only used for Atenxion API call
          
          // Verify cookie was set
          const cookieCheck = document.cookie.split('; ').find((row) => row.startsWith('student_portal_token='));
          if (cookieCheck) {
            console.log('Cookie verification: student_portal_token is present in cookies');
          } else {
            console.error('Cookie verification failed: student_portal_token not found in cookies');
          }

          // Wait a bit longer before redirect to ensure API call completes and appears in network tab
          console.log("⏳ Waiting before redirect to ensure API call is visible in network tab...");
          setTimeout(() => {
            console.log("🔄 Redirecting to student portal (full reload)...");
            if (typeof window !== 'undefined') {
              // window.location.href = `/student-portal/${student.id}`;
              router.push(`/student-portal/${student.id}`);
            }
          }, 500); // Increased delay to 500ms to ensure network request is visible
          return;
        }

        // Staff login path
        if (loginMode === "staff") {
        // Both admin and staff use adminLogin - they're both staff accounts
          const staffSession = await adminLogin(
            values.email.trim(),
            values.password
          );

        if (!staffSession) {
            setSubmitError(
              "Invalid staff credentials or insufficient permissions."
            );
            setIsSubmitting(false);
            return;
        }

          if (typeof window !== "undefined") {
            window.sessionStorage.setItem(
              "brillar_staff_session",
              JSON.stringify(staffSession)
            );
        }

          // All staff (including admins) go to forge portal - forge supports all roles
          setTimeout(() => {
            if (typeof window !== 'undefined') {
              window.location.href = `/forge/${staffSession.staff.id}`;
            }
          }, 100);
          return;
        }

        // Fallback error
        setSubmitError("Please select a login mode.");
        setIsSubmitting(false);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Unexpected error during login.";
        setSubmitError(message);
        setIsSubmitting(false);
      }
    },
  });

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    const newMode: LoginMode = newValue === 0 ? "student" : "staff";
    setLoginMode(newMode);
    setSubmitError("");
    formik.resetForm();
  };

  return (
    <>
    <Box
      sx={{
        minHeight: "100vh",
        background: "#F6F8FB",
        py: { xs: 8, md: 12 },
        position: "relative",
      }}
    >
      <Container maxWidth="sm" sx={{ position: "relative", zIndex: 2 }}>
        <Grid container spacing={4} justifyContent="center">
          {/* Login Form - Centered */}
          <Grid
            item
            xs={12}
            sx={{
              maxWidth: "600px",
              mx: "auto",
              position: "relative",
              zIndex: 10,
            }}
          >
        <Paper
          elevation={0}
          sx={{
            p: { xs: 4, md: 6 },
                border: "1px solid",
                borderColor: "rgba(0, 0, 0, 0.08)",
                background: "rgba(255, 255, 255, 0.98)",
                position: "relative",
                zIndex: 10,
                width: "100%",
                maxWidth: "600px",
          }}
        >
          <Stack spacing={3}>
            <Box textAlign="center">
                  <Box
                    sx={{ display: "flex", justifyContent: "center", mb: 3 }}
                  >
                <Image
                  src="/assets/brillar-logo.png"
                  alt="Brillar Academy Logo"
                  width={120}
                  height={120}
                      style={{ objectFit: "contain" }}
                />
              </Box>
              <Typography variant="h4" fontWeight={700} gutterBottom>
                Welcome back 👋
              </Typography>
              <Typography color="text.secondary">
                    Sign in to continue exploring curated lessons, assignments,
                    and your personalized learning dashboard. Staff can access
                    the Forge portal to manage academic operations.
              </Typography>
            </Box>

            <Tabs
              value={tabValue}
              onChange={handleTabChange}
              variant="fullWidth"
                  aria-label="Login type tabs"
              sx={{
                borderBottom: 1,
                    borderColor: "divider",
                    "& .MuiTab-root": {
                      textTransform: "none",
                  fontWeight: 600,
                      fontSize: "0.95rem",
                      minHeight: 48,
                    },
                    "& .MuiTabs-indicator": {
                      height: 3,
                    },
              }}
            >
                  <Tab
                    label="Student Login"
                    id="student-tab"
                    aria-controls="student-panel"
                  />
                  <Tab
                    label="Staff Login"
                    id="staff-tab"
                    aria-controls="staff-panel"
                  />
            </Tabs>

                {submitError && <Alert severity="error">{submitError}</Alert>}

                <Box component="form" onSubmit={formik.handleSubmit} noValidate>
              <Stack spacing={2.5}>
                <TextField 
                  name="email"
                  label="Email address" 
                  type="email" 
                  fullWidth 
                  required 
                  autoComplete="email"
                  value={formik.values.email}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                      error={
                        formik.touched.email && Boolean(formik.errors.email)
                      }
                  helperText={formik.touched.email && formik.errors.email}
                />
                <TextField
                  name="password"
                  label="Password"
                  type="password"
                  fullWidth
                  required
                  autoComplete="current-password"
                  value={formik.values.password}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                      error={
                        formik.touched.password &&
                        Boolean(formik.errors.password)
                      }
                      helperText={
                        formik.touched.password && formik.errors.password
                      }
                />
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  size="large"
                  sx={{ py: 1.2 }}
                  disabled={isSubmitting}
                      startIcon={
                        isSubmitting ? (
                          <CircularProgress size={20} color="inherit" />
                        ) : undefined
                      }
                >
                  {isSubmitting
                        ? "Logging in…"
                        : loginMode === "staff"
                        ? "Log in as Staff"
                        : "Log in as Student"}
                </Button>
              </Stack>
            </Box>

            <Divider>Need access?</Divider>

            <Stack spacing={1.5}>
              <Typography variant="body2" color="text.secondary">
                    New to Brillar Academy? Create your student account, choose
                    your major, and pick your first subjects on our self
                    registration page. Staff members can still reach out to the
                    IT administrator for Forge access and provisioning support.
              </Typography>
              <Stack
                    direction={{ xs: "column", sm: "row" }}
                spacing={1}
                justifyContent="space-between"
                    alignItems={{ xs: "stretch", sm: "center" }}
              >
                <Link href="/register" underline="hover">
                  Create a student account
                </Link>
                <Link href="/create" underline="hover">
                  Interested in building a new class?
                </Link>
              </Stack>
            </Stack>
          </Stack>
        </Paper>
          </Grid>
        </Grid>
      </Container>
    </Box>
    </>
  );
}
