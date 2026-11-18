import { useNavigate, useOutletContext } from "react-router-dom";
import { Building2 } from "lucide-react";
import styles from "./styles/SchoolViewProfile.module.css";
import { Button } from "@cloudstrytech/ui-components";
import { DocumentImage } from "../../components/DocumentImage";

const SchoolViewProfile = () => {
  const navigate = useNavigate();
  // schoolProfile: GET /school-profiles/me (SchoolLayout), with the last save shown straight away.
  const { logoImage, currentUser, schoolName, schoolProfile } = useOutletContext();
  const p = schoolProfile || {};
  const address = [p.address?.city, p.address?.state].filter(Boolean).join(", ");

  const details = [
    { label: "Email", value: p.contact?.email || currentUser.email || "Not added" },
    { label: "Phone", value: p.contact?.phone || currentUser.phone || "Not added" },
    { label: "City", value: address || currentUser.city || "Not added" },
    { label: "Institute Name", value: schoolName },
    { label: "Board", value: p.board || "Not added" },
    { label: "Level", value: p.level || "Not added" },
    { label: "Medium", value: p.medium || "Not added" },
    { label: "Established", value: p.establishedYear || "Not added" },
    { label: "Website", value: p.contact?.website || "Not added" },
    {
      label: "Total Teachers",
      value: p.totalTeachers || currentUser.totalTeachers
        ? `${p.totalTeachers || currentUser.totalTeachers} Teachers`
        : "Not added",
    },
  ];

  return (
    <div className={styles.wrap}>
      <h2 className={styles.heading}>View Profile</h2>
      <div className={styles.noticeBox}>
        <p className={styles.noticeTitle}>Public Profile Visibility</p>
        <p className={styles.noticeText}>
          This profile is visible to shortlisted candidates and job applicants. You can control visibility below.
        </p>
      </div>
      <div className={styles.card}>
        <div className={styles.cardBanner} />
        <div className={styles.cardBody}>
          <div className={styles.profileRow}>
            <div className={styles.logoWrap}>
              {logoImage ? (
                <DocumentImage src={logoImage} alt="logo" className={styles.logoImg} />
              ) : (
                <Building2 size={36} className={styles.logoIcon} />
              )}
            </div>
            <div className={styles.nameCol}>
              <h2 className={styles.schoolName}>{schoolName}</h2>
              <p className={styles.schoolTagline}>Schools &amp; Institutions</p>
            </div>
           <Button
  variant="outlined"
  type="button"
  onClick={() => navigate("/school/profile")}
>
  Edit Profile
</Button>
          </div>
          <div className={styles.detailsGrid}>
            {details.map((detail) => (
              <div key={detail.label} className={styles.detailCard}>
                <p className={styles.detailLabel}>{detail.label}</p>
                <p className={styles.detailValue}>{detail.value}</p>
              </div>
            ))}
          </div>
          <div className={styles.visibilityRow}>
            <p className={styles.visibilityText}>Profile visible to shortlisted candidates</p>
            <span className={styles.openBadge}>Open</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SchoolViewProfile;
