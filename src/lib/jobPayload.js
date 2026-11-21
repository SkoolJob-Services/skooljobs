// Post-a-job form (components/postjob) → the job service's CreateJobRequest (POST /jobs, action
// CREATE). Shared by the school's and the ADMIN's Post a New Job pages.

export function buildCompensationString(form) {
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
}

export function buildJobApiPayload(form, { schoolProfileId, postedByUserId } = {}) {
  const languageRequirements = (form.languages || [])
    .filter((lang) => lang?.name && lang?.proficiency)
    .map((lang) => `${lang.name} - ${lang.proficiency}`);

  const scheduled = form.publishOption === "Publish Later";
  // publishAt is an Instant: local date + time → ISO with time zone (e.g. 2026-11-20T03:30:00.000Z).
  const publishAt =
    scheduled && form.publishDate && form.publishTime
      ? new Date(`${form.publishDate}T${form.publishTime}`).toISOString()
      : undefined;

  const compensation = buildCompensationString(form);

  return {
    schoolProfileId: schoolProfileId || undefined,
    postedByUserId: postedByUserId ? String(postedByUserId) : undefined,
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
}
