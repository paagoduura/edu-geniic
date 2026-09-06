import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import { LanguageProvider } from "./hooks/useLanguage";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { NativeAppConfig } from "./components/NativeAppConfig";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Lesson from "./pages/Lesson";
import Auth from "./pages/Auth";
import GenerateLesson from "./pages/GenerateLesson";
import LessonHistory from "./pages/LessonHistory";
import Quiz from "./pages/Quiz";
import QuizSetup from "./pages/QuizSetup";
import QuizHistory from "./pages/QuizHistory";
import Performance from "./pages/Performance";
import StudentProfile from "./pages/StudentProfile";
import TeacherDashboard from "./pages/TeacherDashboard";
import TeacherAssignments from "./pages/TeacherAssignments";
import StudentAssignments from "./pages/StudentAssignments";
import Leaderboard from "./pages/Leaderboard";
import Rewards from "./pages/Rewards";
import ParentDashboard from "./pages/ParentDashboard";
import StudyGroups from "./pages/StudyGroups";
import StudyGroupDetail from "./pages/StudyGroupDetail";
import AIStudyBuddy from "./pages/AIStudyBuddy";
import TeacherClassDetail from "./pages/TeacherClassDetail";
import TeacherCommunication from "./pages/TeacherCommunication";
import StudentNotifications from "./pages/StudentNotifications";
import ParentNotifications from "./pages/ParentNotifications";
import Community from "./pages/Community";
import ResetPassword from "./pages/ResetPassword";
import CodingPlayground from "./pages/CodingPlayground";
import CodingProgress from "./pages/CodingProgress";
import Competitions from "./pages/Competitions";
import CompetitionLive from "./pages/CompetitionLive";
import SchoolOnboarding from "./pages/SchoolOnboarding";
import SchoolDashboard from "./pages/SchoolDashboard";
import SchoolStaffManagement from "./pages/SchoolStaffManagement";
import SchoolStudentManagement from "./pages/SchoolStudentManagement";
import SchoolClassManagement from "./pages/SchoolClassManagement";
import SchoolAnalytics from "./pages/SchoolAnalytics";
import SchoolDepartments from "./pages/SchoolDepartments";
import SchoolSettings from "./pages/SchoolSettings";
import PracticalLearning from "./pages/PracticalLearning";
import PracticalTrackDetail from "./pages/PracticalTrackDetail";
import PracticalProjects from "./pages/PracticalProjects";
import PracticalProjectDetail from "./pages/PracticalProjectDetail";
import InstructorReviews from "./pages/InstructorReviews";
import CompetencyManagement from "./pages/CompetencyManagement";
import RubricBuilder from "./pages/RubricBuilder";
import LearnerPortfolio from "./pages/LearnerPortfolio";
import CertificateVerification from "./pages/CertificateVerification";
import CompetencyMappingWorkbench from "./pages/CompetencyMappingWorkbench";
import NotFound from "./pages/NotFound";
import { SCHOOL_ADMIN_ROLES, SCHOOL_ACADEMIC_STAFF_ROLES, SCHOOL_INSTRUCTOR_ROLES } from "./lib/authorization";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <NativeAppConfig theme="light" />
      <Toaster />
      <Sonner />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <LanguageProvider>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
              <Route path="/teacher" element={
                <ProtectedRoute requireSchoolRoles={SCHOOL_INSTRUCTOR_ROLES}>
                  <TeacherDashboard />
                </ProtectedRoute>
              } />
              <Route path="/teacher/assignments" element={
                <ProtectedRoute requireSchoolRoles={SCHOOL_INSTRUCTOR_ROLES}>
                  <TeacherAssignments />
                </ProtectedRoute>
              } />
              <Route path="/teacher/classes/:classId" element={
                <ProtectedRoute requireSchoolRoles={SCHOOL_INSTRUCTOR_ROLES}>
                  <TeacherClassDetail />
                </ProtectedRoute>
              } />
              <Route path="/teacher/communication" element={
                <ProtectedRoute requireSchoolRoles={SCHOOL_INSTRUCTOR_ROLES}>
                  <TeacherCommunication />
                </ProtectedRoute>
              } />
              <Route path="/assignments" element={
                <ProtectedRoute>
                  <StudentAssignments />
                </ProtectedRoute>
              } />
              <Route path="/profile" element={
                <ProtectedRoute>
                  <StudentProfile />
                </ProtectedRoute>
              } />
              <Route path="/leaderboard" element={
                <ProtectedRoute>
                  <Leaderboard />
                </ProtectedRoute>
              } />
              <Route path="/rewards" element={
                <ProtectedRoute>
                  <Rewards />
                </ProtectedRoute>
              } />
              <Route path="/parent" element={
                <ProtectedRoute requireRole="parent">
                  <ParentDashboard />
                </ProtectedRoute>
              } />
              <Route path="/lesson" element={
                <ProtectedRoute>
                  <Lesson />
                </ProtectedRoute>
              } />
              <Route path="/generate-lesson" element={
                <ProtectedRoute>
                  <GenerateLesson />
                </ProtectedRoute>
              } />
              <Route path="/lesson-history" element={
                <ProtectedRoute>
                  <LessonHistory />
                </ProtectedRoute>
              } />
              <Route path="/lesson/:lessonId" element={
                <ProtectedRoute>
                  <Lesson />
                </ProtectedRoute>
              } />
              <Route path="/quiz" element={
                <ProtectedRoute>
                  <Quiz />
                </ProtectedRoute>
              } />
              <Route path="/quiz-setup" element={
                <ProtectedRoute>
                  <QuizSetup />
                </ProtectedRoute>
              } />
              <Route path="/quiz-history" element={
                <ProtectedRoute>
                  <QuizHistory />
                </ProtectedRoute>
              } />
              <Route path="/performance" element={
                <ProtectedRoute>
                  <Performance />
                </ProtectedRoute>
              } />
              <Route path="/study-groups" element={
                <ProtectedRoute>
                  <StudyGroups />
                </ProtectedRoute>
              } />
              <Route path="/study-groups/:groupId" element={
                <ProtectedRoute>
                  <StudyGroupDetail />
                </ProtectedRoute>
              } />
              <Route path="/ai-study-buddy" element={
                <ProtectedRoute>
                  <AIStudyBuddy />
                </ProtectedRoute>
              } />
              <Route path="/notifications" element={
                <ProtectedRoute>
                  <StudentNotifications />
                </ProtectedRoute>
              } />
              <Route path="/parent/notifications" element={
                <ProtectedRoute requireRole="parent">
                  <ParentNotifications />
                </ProtectedRoute>
              } />
              <Route path="/community" element={
                <ProtectedRoute>
                  <Community />
                </ProtectedRoute>
              } />
              <Route path="/coding" element={
                <ProtectedRoute>
                  <CodingPlayground />
                </ProtectedRoute>
              } />
              <Route path="/coding/progress" element={
                <ProtectedRoute>
                  <CodingProgress />
                </ProtectedRoute>
              } />
              <Route path="/practical-learning" element={
                <ProtectedRoute requireRole="student">
                  <PracticalLearning />
                </ProtectedRoute>
              } />
              <Route path="/practical-learning/:trackId" element={
                <ProtectedRoute requireRole="student">
                  <PracticalTrackDetail />
                </ProtectedRoute>
              } />
              <Route path="/practical-projects" element={<ProtectedRoute requireRole="student"><PracticalProjects /></ProtectedRoute>} />
              <Route path="/practical-projects/:projectId" element={<ProtectedRoute requireRole="student"><PracticalProjectDetail /></ProtectedRoute>} />
              <Route path="/competitions" element={
                <ProtectedRoute>
                  <Competitions />
                </ProtectedRoute>
              } />
              <Route path="/competition/:competitionId/live" element={<ProtectedRoute><CompetitionLive /></ProtectedRoute>} />
              <Route path="/school/register" element={<ProtectedRoute><SchoolOnboarding /></ProtectedRoute>} />
              <Route path="/school/onboarding" element={<ProtectedRoute><SchoolOnboarding /></ProtectedRoute>} />
              <Route path="/school" element={<ProtectedRoute requireSchoolRoles={SCHOOL_ADMIN_ROLES}><SchoolDashboard /></ProtectedRoute>} />
              <Route path="/school/staff" element={<ProtectedRoute requireSchoolRoles={SCHOOL_ADMIN_ROLES}><SchoolStaffManagement /></ProtectedRoute>} />
              <Route path="/school/students" element={<ProtectedRoute requireSchoolRoles={SCHOOL_ADMIN_ROLES}><SchoolStudentManagement /></ProtectedRoute>} />
              <Route path="/school/classes" element={<ProtectedRoute requireSchoolRoles={SCHOOL_ADMIN_ROLES}><SchoolClassManagement /></ProtectedRoute>} />
              <Route path="/school/analytics" element={<ProtectedRoute requireSchoolRoles={SCHOOL_ADMIN_ROLES}><SchoolAnalytics /></ProtectedRoute>} />
              <Route path="/school/departments" element={<ProtectedRoute requireSchoolRoles={SCHOOL_ADMIN_ROLES}><SchoolDepartments /></ProtectedRoute>} />
              <Route path="/school/settings" element={<ProtectedRoute requireSchoolRoles={SCHOOL_ADMIN_ROLES}><SchoolSettings /></ProtectedRoute>} />
              <Route path="/school/learning-tracks" element={<ProtectedRoute requireSchoolRoles={SCHOOL_ADMIN_ROLES}><PracticalLearning adminMode /></ProtectedRoute>} />
              <Route path="/school/learning-tracks/:trackId" element={<ProtectedRoute requireSchoolRoles={SCHOOL_ADMIN_ROLES}><PracticalTrackDetail adminMode /></ProtectedRoute>} />
              <Route path="/school/practical-projects" element={<ProtectedRoute requireSchoolRoles={SCHOOL_ADMIN_ROLES}><PracticalProjects adminMode /></ProtectedRoute>} />
              <Route path="/school/practical-projects/:projectId" element={<ProtectedRoute requireSchoolRoles={SCHOOL_ACADEMIC_STAFF_ROLES}><PracticalProjectDetail /></ProtectedRoute>} />
              <Route path="/school/reviews" element={<ProtectedRoute requireSchoolRoles={SCHOOL_INSTRUCTOR_ROLES}><InstructorReviews /></ProtectedRoute>} />
              <Route path="/school/competencies" element={<ProtectedRoute requireSchoolRoles={SCHOOL_ACADEMIC_STAFF_ROLES}><CompetencyManagement /></ProtectedRoute>} />
              <Route path="/school/competency-mapping" element={<ProtectedRoute requireSchoolRoles={SCHOOL_ACADEMIC_STAFF_ROLES}><CompetencyMappingWorkbench /></ProtectedRoute>} />
              <Route path="/school/rubrics/:projectId" element={<ProtectedRoute requireSchoolRoles={SCHOOL_INSTRUCTOR_ROLES}><RubricBuilder /></ProtectedRoute>} />
              <Route path="/portfolio" element={<ProtectedRoute requireRole="student"><LearnerPortfolio /></ProtectedRoute>} />
              <Route path="/verify/certificate/:code" element={<CertificateVerification />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </LanguageProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
