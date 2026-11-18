import styles from "./styles/Authlayout.module.css";
import { BrandLogo } from "./BrandLogo";
import { Link } from "react-router-dom";

function AuthLayout({ children, title, activeTab = 'candidate', onTabChange }) {
  return (
    <div className={styles.page}>
      <div className={styles.grid}>

        {/* Left Side */}
        <div className={styles.leftPanel}>
          <div>
            <Link to="/" className={styles.brandLink} aria-label="SkoolJobs home">
              <BrandLogo onDark height={56} />
            </Link>
            <h1 className={styles.title}>
              {title}
            </h1>

            <p className={styles.subtitle}>
              {activeTab === 'combined'
                ? "Connecting passionate educators with leading schools and institutions."
                : activeTab === 'candidate'
                ? "Build your profile and discover roles that fit your subject and experience."
                : "Post jobs, manage applications, and find the best educators for your school."}
            </p>

            {/* Toggle */}
            {onTabChange && (
              <div className={styles.toggleWrap}>
                <button
                  onClick={() => onTabChange('candidate')}
                  className={`${styles.toggleButton} ${
                    activeTab === 'candidate'
                      ? styles.toggleButtonActive
                      : styles.toggleButtonInactive
                  }`}
                >
                  Teacher
                </button>
                <button
                  onClick={() => onTabChange('employer')}
                  className={`${styles.toggleButton} ${
                    activeTab === 'employer'
                      ? styles.toggleButtonActive
                      : styles.toggleButtonInactive
                  }`}
                >
                  School
                </button>
              </div>
            )}

            {/* Info Box */}
            <div className={styles.infoBox}>
              <div className={styles.infoBoxHeader}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {activeTab === 'combined' ? (
                    <>
                      <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M2 17L12 22L22 17" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M2 12L12 17L22 12" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </>
                  ) : activeTab === 'candidate' ? (
                    <>
                      <path d="M16 7C16 9.20914 14.2091 11 12 11C9.79086 11 8 9.20914 8 7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M12 14C8.13401 14 5 17.134 5 21H19C19 17.134 15.866 14 12 14Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M19 8C20.1046 8 21 8.89543 21 10C21 11.1046 20.1046 12 19 12" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M21 21C21 19.3431 20.3284 17.8431 19.2426 16.7574" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </>
                  ) : (
                    <>
                      <path d="M3 21H21" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M5 21V5C5 4.46957 5.21071 3.96086 5.58579 3.58579C5.96086 3.21071 6.46957 3 7 3H17C17.5304 3 18.0391 3.21071 18.4142 3.58579C18.7893 3.96086 19 4.46957 19 5V21" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M9 7H15" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M9 11H15" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M9 15H11" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </>
                  )}
                </svg>
                <h2 className={styles.infoBoxHeading}>
                  {activeTab === 'combined' ? "SkoolJobs Network" : activeTab === 'candidate' ? "Teachers" : "Schools"}
                </h2>
              </div>

              <p className={styles.infoBoxText}>
                {activeTab === 'combined'
                  ? "Unified platform for teaching careers and recruitment"
                  : activeTab === 'candidate'
                  ? "Dedicated workspace for educators"
                  : "Streamlined hiring for schools & institutions"}
              </p>

              <ul className={styles.featureList}>
                {activeTab === 'combined' ? (
                  <>
                    <li className={styles.featureItem}>
                      <span className={styles.featureDot}></span>
                      <span><strong>For Teachers:</strong> Discover teaching roles & track your applications</span>
                    </li>
                    <li className={styles.featureItem}>
                      <span className={styles.featureDot}></span>
                      <span><strong>For Schools:</strong> Post jobs, search resumes & hire top educators</span>
                    </li>
                    <li className={styles.featureItem}>
                      <span className={styles.featureDot}></span>
                      <span>Secure, unified access with mobile & email support</span>
                    </li>
                  </>
                ) : activeTab === 'candidate' ? (
                  <>
                    <li className={styles.featureItem}>
                      <span className={styles.featureDot}></span>
                      Create a teaching-first profile
                    </li>
                    <li className={styles.featureItem}>
                      <span className={styles.featureDot}></span>
                      Track applications and interview status
                    </li>
                    <li className={styles.featureItem}>
                      <span className={styles.featureDot}></span>
                      Build resumes tailored to school hiring
                    </li>
                  </>
                ) : (
                  <>
                    <li className={styles.featureItem}>
                      <span className={styles.featureDot}></span>
                      Post and manage job listings
                    </li>
                    <li className={styles.featureItem}>
                      <span className={styles.featureDot}></span>
                      Access verified teacher profiles
                    </li>
                    <li className={styles.featureItem}>
                      <span className={styles.featureDot}></span>
                      Streamline your interview process
                    </li>
                  </>
                )}
              </ul>
            </div>
          </div>

          <div className={styles.spacer} />
        </div>

        {/* Right Side */}
        <div className={styles.rightPanel}>
          {children}
        </div>

      </div>
    </div>
  );
}

export default AuthLayout;
