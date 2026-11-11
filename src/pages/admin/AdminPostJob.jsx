import { useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { Eye, Save, Send } from "lucide-react";
import RoleBasicInfo from "../../components/postjob/RoleBasicInfo";
import LanguageRequirements from "../../components/postjob/LanguageRequirements";
import QualificationsSection from "../../components/postjob/QualificationsSection";
import JobDescriptionSection from "../../components/postjob/JobDescriptionSection";
import SkillsSection from "../../components/postjob/SkillsSection";
import SalaryBenefits from "../../components/postjob/SalaryBenefits";
import HiringPreferences from "../../components/postjob/HiringPreferences";
import JobPreview from "../../components/postjob/JobPreview";
import { Button } from "@cloudstrytech/ui-components";
import { validateFields } from "../../lib/textValidation";
import { generateJobBannerDataUrl } from "../../lib/generateJobImage";
import styles from "../school/styles/SchoolPostJob.module.css";

const blankForm = {
  // Section 1 — Role & Basic Info
  branchSchool: "",
  roleCategory: "",
  jobTitle: "",
  employmentType: "Full Time",
  location: "",
  joiningTimeline: "",

  // Section 2 — Language Requirements
  languageType: "Indian",
  languages: [
    { name: "English", proficiency: "Fluent" },
    { name: "Hindi", proficiency: "Conversational" },
    { name: "Gujarati", proficiency: "Basic" },
  ], // [{ name, proficiency }]

  // Section 3 — Qualifications & Experience
  minQualification: "",
  additionalQualification: "",
  certifications: [],
  experience: "",
  studentLevels: [],
  preferredSchoolTypes: [],

  // Section 4 — Job Description
  shortDescription: "",
  description: "",
  aiGeneratedImage: "",
  jobLogoImage: "",

  // Section 5 — Skills
  requiredSkills: [],
  technicalSkills: [],

  // Section 6 — Salary & Benefits
  compensationStructure: "Monthly",
  monthlyBenefits: [],
  annualBenefits: [],
  // Full Time
  minAnnualCTC: "",
  maxAnnualCTC: "",
  inHandPercentage: "75",
  minMonthlySalary: "",
  maxMonthlySalary: "",
  // Part Time
  minHourlyRate: "",
  maxHourlyRate: "",
  hoursPerWeek: "",
  // Contract
  contractDuration: "",
  contractPaymentType: "Monthly Payment (₹)",
  contractMonthlyPayment: "",
  contractTotalValue: "",
  // Hybrid
  wfhDays: "",
  officeDays: "",
  // Remote
  workTimezone: "",
  remoteLocation: "",
  // Internship
  internshipDuration: "",
  minStipend: "",
  maxStipend: "",

  // Section 7 — Hiring Preferences
  genderPreference: "Any",
  interviewMode: "",
  publishOption: "Publish Immediately",
  publishDate: "",
  publishTime: "",
};

const AdminPostJob = () => {
  const navigate = useNavigate();
  const { setJobs, currentUser, managedSchools } = useOutletContext();

  const [form, setForm] = useState(blankForm);
  const [generating, setGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const setField = (key, value) => setForm((p) => ({ ...p, [key]: value }));

  const checkContent = () => {
    const { valid, errors } = validateFields({
      jobTitle: form.jobTitle,
      customJobTitle: form.customJobTitle,
      customSubject: form.customSubject,
      location: form.location,
      shortDescription: form.shortDescription,
      description: form.description,
    });
    if (!valid) {
      alert(Object.values(errors)[0]);
      return false;
    }
    return true;
  };

  const handleGenerateJD = () => {
    if (!form.jobTitle) {
      alert("Enter a Job Title first.");
      return;
    }
    setGenerating(true);
    setTimeout(() => {
      const subject = form.subject || "the assigned subject";
      const exp = form.experience || "relevant experience";
      const bannerImage = generateJobBannerDataUrl({
        title: form.jobTitle,
        subject: form.subject,
        employmentType: form.employmentType,
      });
      setForm((p) => ({
        ...p,
        shortDescription: `We're hiring a ${form.jobTitle} to teach ${subject}. ${exp} preferred. Join a school that values academic excellence and supports its teachers.`,
        description:
          `We are seeking a dedicated and passionate ${form.jobTitle} to join our team. The ideal candidate will have ${exp} in teaching ${subject} and a strong commitment to academic excellence.\n\nKey Responsibilities:\n• Plan, prepare and deliver engaging instructional activities\n• Develop curriculum aligned with board standards\n• Assess and evaluate student progress through tests and assignments\n• Maintain a positive and disciplined classroom environment\n• Communicate regularly with parents/guardians regarding student performance\n• Participate in school meetings and professional development programs`,
        aiGeneratedImage: bannerImage,
      }));
      setGenerating(false);
    }, 1500);
  };

  const buildJob = (status, requestedStatus) => ({
    id: Date.now(),
    title: form.jobTitle,
    subject: form.subject || "",
    roleType: form.roleCategory,
    employmentType: form.employmentType,
    location: form.location,
    experience: form.experience,
    shortDescription: form.shortDescription,
    description: form.description,
    jobImage: form.jobLogoImage || form.aiGeneratedImage || "",
    status,
    requestedStatus: requestedStatus || "",
    schoolName: form.branchSchool,
    schoolEmail: currentUser.email || "",
    rejectionReason: "",
    applicants: 0,
    vacancies: 1,
    salaryRange: form.minAnnualCTC
      ? `₹${form.minAnnualCTC} – ₹${form.maxAnnualCTC}`
      : "",
    date: new Date().toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }),
    expiryDate: "",
  });

  const handleSaveDraft = () => {
    if (!form.jobTitle) {
      alert("Enter a Job Title before saving as draft.");
      return;
    }
    if (!checkContent()) return;
    setJobs((p) => [buildJob("Draft"), ...p]);
    setForm(blankForm);
    alert("Job saved as draft!");
    navigate("/admin/manage-jobs");
  };

  const handlePublish = () => {
    if (!form.branchSchool) {
      alert("Select which school this job is for.");
      return;
    }
    if (!form.jobTitle || !form.location || !form.employmentType) {
      alert("Job Title, Location and Employment Type are required to publish.");
      return;
    }
    const scheduled = form.publishOption === "Publish Later";
    if (scheduled && (!form.publishDate || !form.publishTime)) {
      alert("Please select a date and time to schedule the job.");
      return;
    }
    if (!checkContent()) return;
    // The admin is the approver, so their own job skips the approval queue.
    setJobs((p) => [buildJob(scheduled ? "Scheduled" : "Active"), ...p]);
    setForm(blankForm);
    alert(scheduled ? "Job scheduled." : "Job published.");
    navigate("/admin/manage-jobs");
  };

  return (
    <div className={styles.page}>
      {/* Page header */}
      <div className={styles.headerCard}>
        <h2 className={styles.headerTitle}>Post a New Job</h2>
        <p className={styles.headerSubtitle}>
          Create a detailed job post for one of the {managedSchools.length} schools.
        </p>
      </div>

      {/* 7 sections */}
      <RoleBasicInfo
        form={form}
        setField={setField}
        managedSchools={managedSchools}
      />
      <LanguageRequirements form={form} setField={setField} />
      <QualificationsSection form={form} setField={setField} />
      <JobDescriptionSection
        form={form}
        setField={setField}
        onGenerateJD={handleGenerateJD}
        generating={generating}
      />
      <SkillsSection form={form} setField={setField} />
      <SalaryBenefits form={form} setField={setField} />
      <HiringPreferences form={form} setField={setField} />

      {/* Footer */}
      <div className={styles.footer}>
        <Button
          variant="text"
          type="button"
          onClick={() => navigate("/admin/manage-jobs")}
        >
          Cancel
        </Button>

        <div className={styles.footerActions}>
          <Button
            variant="outlined"
            type="button"
            onClick={() => setShowPreview(true)}
          >
            <Eye size={15} /> Preview
          </Button>

          <Button
            variant="outlined"
            type="button"
            onClick={handleSaveDraft}
          >
            <Save size={15} /> Save as Draft
          </Button>

          <Button
            type="button"
            onClick={handlePublish}
          >
            <Send size={15} />
            {form.publishOption === "Publish Later"
              ? "Schedule Job"
              : "Send for Approval"}
          </Button>
        </div>
      </div>

      {showPreview && <JobPreview form={form} onClose={() => setShowPreview(false)} />}
    </div>
  );
};

export default AdminPostJob;
