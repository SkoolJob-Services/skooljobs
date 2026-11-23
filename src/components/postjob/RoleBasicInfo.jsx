import { MapPin } from "lucide-react";
import SectionCard from "./SectionCard";
import postjob from "../../../dropdown/School_module/postjob.json";
import styles from "./styles/RoleBasicInfo.module.css";
import { Input, Select } from "@cloudstrytech/ui-components";
import { toOptions } from "../../lib/selectOptions";
import SelectOrOther from "../ui/SelectOrOther";

const {
  Role_category: ROLE_CATEGORIES_RAW,
  Job_title_group: JOB_TITLE_GROUPS,
  Subject_by_job_title: SUBJECTS_BY_JOB_TITLE,
  Joining_timeline: JOINING_TIMELINES_RAW,
  Employment_type: EMPLOYMENT_TYPES,
} = postjob;

const ROLE_CATEGORIES = toOptions(ROLE_CATEGORIES_RAW);
const JOINING_TIMELINES = toOptions(JOINING_TIMELINES_RAW);

const RoleBasicInfo = ({ form, setField, managedSchools }) => {
  const jobTitleList = toOptions(
    form.roleCategory
      ? [...(JOB_TITLE_GROUPS[form.roleCategory] || []), "Other"]
      : [],
  );
  const subjectList = toOptions(
    form.jobTitle
      ? [...(SUBJECTS_BY_JOB_TITLE[form.jobTitle] || []), "Other"]
      : [],
  );

  const handleRoleChange = (value) => {
    setField("roleCategory", value);
    setField("jobTitle", "");
    setField("subject", "");
  };

  const handleJobTitleChange = (value) => {
    setField("jobTitle", value);
    setField("subject", "");
  };

  return (
    <SectionCard number={1} title="Role & Basic Information">
      <div className={styles.fieldGroup}>

        {managedSchools && managedSchools.length > 0 && (
          <div>
            <label className={styles.label}>
              School / Branch <span className={styles.required}>*</span>
            </label>
            <Select
              value={form.branchSchool}
              onChange={(value) => setField("branchSchool", value)}
              placeholder="Select which school this job is for"
              options={toOptions(managedSchools)}
            />
          </div>
        )}

        {/* Row 1: Role Category + Job Title + Subject/Department */}
        <div className={styles.rowThree}>

          <div>
            <label className={styles.label}>
              Role Category <span className={styles.required}>*</span>
            </label>
            <Select
              value={form.roleCategory}
              onChange={(value) => handleRoleChange(value)}
              placeholder="Select Category"
              options={ROLE_CATEGORIES}
            />
          </div>

          <div>
            <label className={styles.label}>
              Job Title <span className={styles.required}>*</span>
            </label>
            <SelectOrOther
              value={form.jobTitle}
              onChange={(value) => handleJobTitleChange(value)}
              placeholder={form.roleCategory ? "Select Job Title" : "Select Role Category first"}
              options={jobTitleList}
              disabled={!form.roleCategory}
              otherValue={form.customJobTitle || ""}
              onOtherChange={(value) => setField("customJobTitle", value)}
              otherPlaceholder="Enter custom job title"
            />
          </div>

          <div>
            <label className={styles.label}>
              Subject / Department <span className={styles.required}>*</span>
            </label>
            <SelectOrOther
              value={form.subject}
              onChange={(value) => setField("subject", value)}
              placeholder={
                !form.roleCategory
                  ? "Select Role Category first"
                  : !form.jobTitle
                    ? "Select Job Title first"
                    : subjectList.length
                      ? "Select Subject / Department"
                      : "No subjects available"
              }
              options={subjectList}
              disabled={!form.jobTitle || !subjectList.length}
              otherValue={form.customSubject || ""}
              onOtherChange={(value) => setField("customSubject", value)}
              otherPlaceholder="Enter custom subject/department"
            />
          </div>
        </div>

        {/* Row 2: Employment Type */}
        <div>
          <label className={styles.labelMb2}>
            Employment Type <span className={styles.required}>*</span>
          </label>
          <div className={styles.employmentTypeWrap}>
            {EMPLOYMENT_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setField("employmentType", type)}
                aria-pressed={form.employmentType === type}
                className={`${styles.employmentTypeButton} ${form.employmentType === type ? styles.employmentTypeButtonActive : ""
                  }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Row 3: Location + Joining Timeline */}
        <div className={styles.rowTwo}>
          <div>
            <label className={styles.label}>
              Location <span className={styles.required}>*</span>
            </label>
            <div className={styles.locationField}>
              <MapPin size={15} className={styles.locationIcon} />
            <Input
  value={form.location}
  onChange={(value) => setField("location", value)}
  placeholder="e.g. Ahmedabad, Gujarat"
/>
            </div>
          </div>

          <div>
            <label className={styles.label}>
              Joining Timeline <span className={styles.required}>*</span>
            </label>
                <Select
                  value={form.joiningTimeline}
                  onChange={(v) => setField("joiningTimeline", v)}
                  placeholder="Select Timeline"
                  options={JOINING_TIMELINES}
                />
              </div>
        </div>

      </div>
    </SectionCard>
  );
};

export default RoleBasicInfo;
