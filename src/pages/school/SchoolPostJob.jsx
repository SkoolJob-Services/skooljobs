import { useMemo, useState } from "react";
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
import { createJob } from "../../services/jobService";
import styles from "./styles/SchoolPostJob.module.css";


const blankForm = {
  // Section 1 — Role & Basic Info
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

const SchoolPostJob = () => {
  const navigate = useNavigate();
  const { setJobs } = useOutletContext();

  const storedUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("currentUser") || "{}");
    } catch {
      return {};
    }
  }, []);

  const [form, setForm] = useState(blankForm);
  const [generating, setGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [isPosting, setIsPosting] = useState(false);

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
    schoolName: storedUser.companyName || storedUser.name || "School",
    schoolEmail: storedUser.email || "",
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
    navigate("/school/manage-jobs");
  };

  // Existing per-employment-type salary fields (SalaryBenefits.jsx) flattened
  // into the single free-text string the Job SDK's `compensation` field expects.
  const buildCompensationString = () => {
    switch (form.employmentType) {
      case "Full Time":
        return form.minAnnualCTC
          ? `₹${form.minAnnualCTC} – ₹${form.maxAnnualCTC || form.minAnnualCTC} per annum`
          : "";
      case "Part Time":
        return form.minHourlyRate
          ? `₹${form.minHourlyRate} – ₹${form.maxHourlyRate || form.minHourlyRate} per hour`
          : "";
      case "Contract":
        return form.contractPaymentType === "Monthly Payment (₹)"
          ? form.contractMonthlyPayment
            ? `₹${form.contractMonthlyPayment} per month (contract)`
            : ""
          : form.contractTotalValue
            ? `₹${form.contractTotalValue} total contract value`
            : "";
      case "Hybrid":
      case "Remote":
        return form.minMonthlySalary
          ? `₹${form.minMonthlySalary} – ₹${form.maxMonthlySalary || form.minMonthlySalary} per month`
          : "";
      case "Internship":
        return form.minStipend
          ? `₹${form.minStipend} – ₹${form.maxStipend || form.minStipend} per month (stipend)`
          : "";
      default:
        return "";
    }
  };

  const buildJobApiPayload = (schoolProfileId) => {
    const languageRequirements = (form.languages || [])
      .filter((lang) => lang?.name && lang?.proficiency)
      .map((lang) => `${lang.name} - ${lang.proficiency}`);

    const scheduled = form.publishOption === "Publish Later";
    const publishAt =
      scheduled && form.publishDate && form.publishTime
        ? `${form.publishDate}T${form.publishTime}:00`
        : undefined;

    const compensation = buildCompensationString();

    return {
      schoolProfileId,
      postedByUserId: String(storedUser.id),
      title: form.jobTitle,
      subject: form.subject || undefined,
      roleCategory: form.roleCategory || undefined,
      employmentType: form.employmentType || undefined,
      joiningTimeline: form.joiningTimeline || undefined,
      location: form.location || undefined,
      description: form.description || form.shortDescription || undefined,
      compensation: compensation || undefined,
      vacancies: 1,
      languageType: form.languageType || undefined,
      languageRequirements: languageRequirements.length
        ? languageRequirements
        : undefined,
      minQualification: form.minQualification || undefined,
      additionalQualification: form.additionalQualification || undefined,
      certifications: form.certifications?.length ? form.certifications : undefined,
      experienceRequired: form.experience || undefined,
      studentLevels: form.studentLevels?.length ? form.studentLevels : undefined,
      preferredSchoolTypes: form.preferredSchoolTypes?.length
        ? form.preferredSchoolTypes
        : undefined,
      requiredSkills: form.requiredSkills?.length ? form.requiredSkills : undefined,
      technicalSkills: form.technicalSkills?.length ? form.technicalSkills : undefined,
      genderPreference: form.genderPreference || undefined,
      interviewMode: form.interviewMode || undefined,
      publishOption: form.publishOption || undefined,
      publishAt,
    };
  };

  const handlePublish = async () => {
    if (isPosting) return;
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

    const schoolProfileId = localStorage.getItem("schoolProfileId");
    console.log("schoolProfileId:", schoolProfileId);
    if (!schoolProfileId) {
      alert("Please save your School Profile before posting a job.");
      return;
    }

    const payload = buildJobApiPayload(schoolProfileId);
    console.log("Job API payload:", payload);

    setIsPosting(true);
    try {
      const response = await createJob(payload);
      console.log("Job API response:", response);
      setJobs((p) => [
        buildJob("Pending Approval", scheduled ? "Scheduled" : "Active"),
        ...p,
      ]);
      setForm(blankForm);
      alert(
        "Job sent to SkoolJobs for approval. Once approved, you can publish it from Manage Jobs.",
      );
      navigate("/school/manage-jobs");
    } catch (error) {
      console.error("Job API error:", error);
      alert("Failed to submit job to SkoolJobs. Please try again.");
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <div className={styles.page}>
      {/* Page header */}
      <div className={styles.headerCard}>
        <h2 className={styles.headerTitle}>Post a New Job</h2>
        <p className={styles.headerSubtitle}>
          Create a detailed job post to attract the right candidates.
        </p>
      </div>

      {/* 7 sections */}
      <RoleBasicInfo form={form} setField={setField} />
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
          onClick={() => navigate("/school/manage-jobs")}
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
            disabled={isPosting}
          >
            <Send size={15} />
            {isPosting
              ? "Submitting..."
              : form.publishOption === "Publish Later"
                ? "Schedule Job"
                : "Send for Approval"}
          </Button>
        </div>
      </div>

      {showPreview && <JobPreview form={form} onClose={() => setShowPreview(false)} />}
    </div>
  );
};

export default SchoolPostJob;
