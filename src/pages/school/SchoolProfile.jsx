import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { profileSections } from "../../lib/schooldata";
import profileOptions from "../../../dropdown/School_module/profile.json";
import { Button, Input, Select } from "@cloudstrytech/ui-components";
import { toOptions } from "../../lib/selectOptions";
import styles from "./styles/SchoolProfile.module.css";
import {
  getSchoolProfile,
  saveSchoolProfile,
  updateSchoolProfile,
} from "../../services/schoolProfileService";
import { useImageUpload } from "../../lib/useImageUpload";
import { validateFields } from "../../lib/textValidation";
import {
  ArrowLeft,
  BriefcaseBusiness,
  Building2,
  Camera,
  CreditCard,
  Globe,
  Heart,
  ImageIcon,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  PlusCircle,
  Settings,
  Upload,
  Users,
  X,
} from "lucide-react";



const {
  Sector: sectorsRaw,
  Medium: mediumsRaw,
  Level: levelsRaw,
  Board: boardsRaw,
  Industry: industriesRaw,
  Country: countriesRaw,
  Indian_state: indianStatesRaw,
  Student_count: studentCountOptionsRaw,
  Students_per_class: studentsPerClassOptionsRaw,
  Public_view: publicViewOptionsRaw,
  Bus_service: busServiceOptionsRaw,
} = profileOptions;

const sectors = toOptions(sectorsRaw);
const mediums = toOptions(mediumsRaw);
const levels = toOptions(levelsRaw);
const boards = toOptions(boardsRaw);
const industries = toOptions(industriesRaw);
const countries = toOptions(countriesRaw);
const indianStates = toOptions(indianStatesRaw);
const studentCountOptions = toOptions(studentCountOptionsRaw);
const studentsPerClassOptions = toOptions(studentsPerClassOptionsRaw);
const publicViewOptions = toOptions(publicViewOptionsRaw);
const busServiceOptions = toOptions(busServiceOptionsRaw);

const sidebarItems = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    route: "/school/dashboard",
  },
  { id: "companyProfile", label: "Institute Profile", icon: Building2 },
  {
    id: "postJob",
    label: "Post a New Job",
    icon: PlusCircle,
    route: "/school/post-job",
  },
  {
    id: "manageJobs",
    label: "Manage Jobs",
    icon: BriefcaseBusiness,
    route: "/school/manage-jobs",
  },
  {
    id: "allApplicants",
    label: "All Applicants",
    icon: Users,
    route: "/school/all-applicants",
  },
  {
    id: "savedCandidates",
    label: "Saved Candidates",
    icon: Heart,
    route: "/school/saved-candidates",
  },
  {
    id: "packages",
    label: "Packages",
    icon: Package,
    route: "/school/packages",
  },
  {
    id: "transactions",
    label: "Transactions",
    icon: CreditCard,
    route: "/school/transactions",
  },
  {
    id: "settings",
    label: "Settings",
    icon: Settings,
    route: "/school/settings",
  },
];

const establishmentYears = toOptions(
  Array.from({ length: 76 }, (_, i) => String(2025 - i)),
);

const labelClass = styles.fieldLabel;

const Field = ({ label, required, children }) => (
  <div>
    <label className={labelClass}>
      {label}
      {required && <span className={styles.requiredMark}>*</span>}
    </label>
    {children}
  </div>
);

const SchoolProfile = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeSection = searchParams.get("section") || "basic";
  const setActiveSection = (id) =>
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("section", id);
        return next;
      },
      { replace: true },
    );
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [logoImage, setLogoImage] = useState(null);
  const [coverImage, setCoverImage] = useState(null);
  const [galleryImages, setGalleryImages] = useState([]);
  const {
    error: logoImageError,
    validating: logoImageValidating,
    validateAndProcess: validateLogoImage,
  } = useImageUpload("logo");
  const {
    error: coverImageError,
    validating: coverImageValidating,
    validateAndProcess: validateCoverImage,
  } = useImageUpload("cover");
  const {
    error: galleryImagesError,
    validating: galleryImagesValidating,
    validateAndProcessMultiple: validateGalleryImages,
  } = useImageUpload("gallery");
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [pincodeError, setPincodeError] = useState("");

  // Area / locality search (India Post "postoffice" endpoint)
  const [areaQuery, setAreaQuery] = useState("");
  const [areaResults, setAreaResults] = useState([]);
  const [areaLoading, setAreaLoading] = useState(false);
  const [areaError, setAreaError] = useState("");
  const [showAreaDropdown, setShowAreaDropdown] = useState(false);

  const currentUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("currentUser") || "{}");
    } catch {
      return {};
    }
  }, []);

  const schoolName =
    currentUser.companyName ||
    currentUser.schoolName ||
    currentUser.firstName ||
    "Som Lalit School";
  const [formData, setFormData] = useState({
    firstName: currentUser.firstName || "Som Lalit School",
    lastName: currentUser.lastName || "Jankara Nagar, Ahmedabad",
    companyName: currentUser.companyName || "Som Lalit School",
    email: currentUser.email || "ms@somlalit.com",
    profileUrl: "https://skooljobs.com/employer/som-lalit-school",
    publicView: "Yes",
    phone: currentUser.phone || "",
    website: "",
    sector: "Schools & Institutions",
    aboutInstitute: "",
    totalStudents: "",
    studentsPerClass: "",
    schoolTimings: "",
    busService: "",
    establishedYear: "2000",
    industry: "Schools & Institutions",
    schoolType: "",
    affiliationStatus: "",

    medium: "English",
    level: "",
    board: "",
    alternateEmail: "",
    facebook: "",
    twitter: "",
    linkedin: "",
    country: "India",
    state: "",
    city: "",
    area: "",
    postalCode: "",
    addressLane1: "",
    addressLane2: "",
  });

  // Edit mode when a profile id exists; the fetched profile is kept as the
  // base for UPDATE so backend fields the form doesn't edit are preserved.
  const [schoolProfileId, setSchoolProfileId] = useState(
    () => localStorage.getItem("schoolProfileId") || null,
  );
  const [loadedProfile, setLoadedProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(
    () => !!localStorage.getItem("schoolProfileId"),
  );
  const [profileLoadFailed, setProfileLoadFailed] = useState(false);

  useEffect(() => {
    const storedId = localStorage.getItem("schoolProfileId");
    if (!storedId) return;

    let cancelled = false;
    getSchoolProfile(storedId)
      .then(({ data }) => {
        if (cancelled || !data) return;
        setLoadedProfile(data);
        const has = (v) => v !== undefined && v !== null && v !== "";
        const mapped = {
          companyName: data.schoolName,
          sector: data.sector,
          board: data.board,
          medium: data.medium,
          level: data.level,
          industry: data.industry,
          aboutInstitute: data.description,
          establishedYear: has(data.establishedYear)
            ? String(data.establishedYear)
            : undefined,
          email: data.contact?.email,
          phone: data.contact?.phone,
          website: data.contact?.website,
          postalCode: data.address?.pinCode,
          city: data.address?.city,
          state: data.address?.state,
          country: data.address?.country,
          linkedin: data.socialLinks?.linkedin,
          facebook: data.socialLinks?.facebook,
          twitter: data.socialLinks?.twitter,
        };
        setFormData((prev) => {
          const next = { ...prev };
          Object.entries(mapped).forEach(([key, value]) => {
            if (has(value)) next[key] = value;
          });
          return next;
        });
      })
      .catch((error) => {
        if (cancelled) return;
        if (error?.response?.status === 404) {
          // Unknown id → stay in create mode. The stored id is left alone so a
          // refresh can retry (the async projection may not have caught up yet);
          // a successful CREATE overwrites it.
          setSchoolProfileId(null);
        } else {
          console.error("Failed to load school profile:", error);
          setProfileLoadFailed(true);
          alert("Failed to load profile.");
        }
      })
      .finally(() => {
        if (!cancelled) setProfileLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);


  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const setField = (name, value) =>
    setFormData((prev) => ({ ...prev, [name]: value }));

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    const url = await validateLogoImage(file);
    if (url) setLogoImage(url);
  };

  const handleCoverUpload = async (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    const url = await validateCoverImage(file);
    if (url) setCoverImage(url);
  };

  const handleGalleryUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    const urls = await validateGalleryImages(files);
    if (urls.length > 0) {
      setGalleryImages((prev) => [...prev, ...urls].slice(0, 8));
    }
  };

  const handleNavClick = (item) => {
    if (item.route) navigate(item.route);
  };

  const handleLogout = () => {
    localStorage.removeItem("currentUser");
    navigate("/");
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (activeSection === "address" && !formData.postalCode) {
      alert("Postal Code is required for job location matching.");
      return;
    }
    if (activeSection === "other" && !formData.level) {
      alert("Level is required as it directly affects job matching.");
      return;
    }
    const { valid, errors } = validateFields({
      aboutInstitute: formData.aboutInstitute,
    });
    if (!valid) {
      alert(Object.values(errors)[0]);
      return;
    }

    console.log(currentUser);


    const payload = {
      schoolAdminId: String(currentUser.id),
      schoolName: formData.companyName,
      sector: formData.sector,
      // No form inputs exist for these yet: keep backend values on edit,
      // fall back to the existing create-time defaults otherwise.
      schoolType: loadedProfile?.schoolType ?? "Private",
      affiliationStatus: loadedProfile?.affiliationStatus ?? "Affiliated",

      board: formData.board,
      medium: formData.medium,
      level: formData.level,
      industry: formData.industry,
      description: formData.aboutInstitute,

      contact: {
        email: formData.email,
        phone: formData.phone,
        website: formData.website,
      },

      address: {
        pinCode: formData.postalCode,
        city: formData.city,
        state: formData.state,
        country: formData.country,
      },

      socialLinks: {
        linkedin: formData.linkedin,
        facebook: formData.facebook,
        twitter: formData.twitter,
        instagram: "",
      },
    };
    console.log("Form Data:", formData);
    console.log("Board =", payload.board);
    console.log("Level =", payload.level);
    console.log("Payload =", JSON.stringify(payload, null, 2));
    if (profileLoading) return;
    if (schoolProfileId && profileLoadFailed) {
      alert("Profile could not be loaded. Please refresh before saving.");
      return;
    }
    try {
      if (schoolProfileId) {
        // UPDATE: complete SchoolProfile, fetched profile as base so fields
        // the form doesn't edit (logoUrl, fullAddress, ...) survive.
        const updatePayload = {
          ...loadedProfile,
          ...payload,
          contact: { ...loadedProfile?.contact, ...payload.contact },
          address: { ...loadedProfile?.address, ...payload.address },
          socialLinks: {
            ...loadedProfile?.socialLinks,
            ...payload.socialLinks,
          },
          schoolProfileId,
        };
        const response = await updateSchoolProfile(updatePayload);
        console.log("API Response:", response);
        // 202 CommandAccepted — processed asynchronously; keep what we sent
        // as the base for any further saves on this page.
        setLoadedProfile(updatePayload);
        alert(response?.data?.message || "Profile update submitted successfully!");
        return;
      }

      const response = await saveSchoolProfile(payload);
      console.log("API Response:", response);
      const newSchoolProfileId = response?.data?.schoolProfileId;
      if (newSchoolProfileId) {
        localStorage.setItem("schoolProfileId", newSchoolProfileId);
        setSchoolProfileId(newSchoolProfileId);
        setLoadedProfile({ ...payload, schoolProfileId: newSchoolProfileId });
      }
      alert("Profile saved successfully!");
    } catch (error) {
      console.error("API Error:", error);
      alert("Failed to save profile.");
    }
  };

  // Profile completion calculation
  const completionFields = [
    formData.companyName,
    formData.email,
    formData.phone,
    formData.website,
    formData.aboutInstitute,
    formData.level,
    formData.board,
    formData.medium,
    formData.establishedYear,
    formData.city,
    formData.postalCode,
    formData.totalStudents,
    formData.schoolTimings,
  ];
  const completionPct = Math.round(
    (completionFields.filter(Boolean).length / completionFields.length) * 100,
  );

  // ─── Render Basic Info ─────────────────────────────────────────────────────

  const renderBasicInfo = () => (
    <div className={styles.sectionStack}>
      <h2 className={styles.sectionTitle}>Basic Information</h2>

      {/* Logo + Cover photo upload */}
      <div className={styles.logoCoverRow}>
        {/* Institute logo */}
        <div className={styles.logoCol}>
          <div className={styles.logoBox}>
            {logoImage ? (
              <img src={logoImage} alt="logo" className={styles.logoImg} />
            ) : (
              <Building2 size={32} className={styles.logoPlaceholderIcon} />
            )}
          </div>
          <label className={styles.uploadLogoLabel}>
            <Upload size={13} />{" "}
            {logoImageValidating
              ? "Checking..."
              : logoImage
                ? "Change Logo"
                : "Upload Logo"}
            <input
              type="file"
              hidden
              accept="image/*"
              disabled={logoImageValidating}
              onChange={handleLogoUpload}
            />
          </label>
          <p className={styles.logoHint}>Recommended: 200×200px</p>
          {logoImageError && <p className={styles.errorText}>{logoImageError}</p>}
        </div>

        {/* Cover photo */}
        <div className={styles.coverCol}>
          <label className={styles.uploadCoverLabel}>
            <ImageIcon size={16} />{" "}
            {coverImageValidating ? "Checking..." : "Upload Cover Photo"}
            <input
              type="file"
              hidden
              accept="image/*"
              disabled={coverImageValidating}
              onChange={handleCoverUpload}
            />
          </label>
          {coverImageError && <p className={styles.errorText}>{coverImageError}</p>}
          {coverImage && (
            <div className={styles.coverPreviewWrap}>
              <img src={coverImage} alt="cover" className={styles.coverPreviewImg} />
            </div>
          )}
        </div>
      </div>

      <div className={styles.fieldGrid}>
        <Field label="First Name" required>
          <Input
            value={formData.firstName}
            onChange={(value) =>
              setFormData((prev) => ({
                ...prev,
                firstName: value,
              }))
            }
          />
        </Field>
        <Field label="Last Name" required>
          <Input
            value={formData.lastName}
            onChange={(value) =>
              setFormData((prev) => ({
                ...prev,
                lastName: value,
              }))
            }
          />
        </Field>
        <Field label="Institute Name" required>
          <Input
            value={formData.companyName}
            onChange={(value) =>
              setFormData((prev) => ({
                ...prev,
                companyName: value,
              }))
            }
          />
        </Field>
        <Field label="Email" required>
          <Input
            value={formData.email}
            onChange={(value) =>
              setFormData((prev) => ({
                ...prev,
                email: value,
              }))
            }
          />
        </Field>
      </div>

      {/* Profile URL */}
      <div>
        <label className={labelClass}>Profile URL</label>
        <div className={styles.profileUrlRow}>
          <Globe size={15} className={styles.profileUrlIcon} />
          <span className={styles.profileUrlText}>
            {formData.profileUrl}
          </span>
          <Button variant="outlined" color type="button">
            Edit
          </Button>
        </div>
      </div>

      <div className={styles.fieldGrid}>
        <Field label="Profile for Public View">
          <Select
            options={publicViewOptions}
            value={formData.publicView}
            onChange={(v) => setField("publicView", v)}
            placeholder="Select public view"
          />
        </Field>
        <Field label="Phone">
          <Input
            value={formData.phone}
            onChange={(value) =>
              setFormData((prev) => ({
                ...prev,
                phone: value,
              }))
            }
            placeholder="Phone number"
          />
        </Field>
        <Field label="Website">
          <Input
            value={formData.website}
            onChange={(value) =>
              setFormData((prev) => ({
                ...prev,
                website: value,
              }))
            }
            placeholder="https://yourwebsite.com"
          />
        </Field>
        <Field label="Sector" required>
          <Select
            value={formData.sector}
            onChange={(v) => setField("sector", v)}
            placeholder="Select Sector"
            options={sectors}
          />
        </Field>
      </div>

      {/* About the Institute (renamed from About the Company) */}
      <div>
        <label className={labelClass}>About the Institute</label>
        <div className={styles.editorBox}>
          <div className={styles.editorToolbar}>
            {["B", "I", "U", "S", "≡", "≡", "≡", "⊞", "🔗", "↩", "↪"].map(
              (btn, i) => (
                <button
                  key={i}
                  type="button"
                  className={styles.editorToolbarBtn}
                >
                  {btn}
                </button>
              ),
            )}
            <div className={styles.editorModeGroup}>
              <button
                type="button"
                className={styles.editorModeBtnActive}
              >
                Visual
              </button>
              <button
                type="button"
                className={styles.editorModeBtn}
              >
                Text
              </button>
            </div>
          </div>
          <textarea
            name="aboutInstitute"
            value={formData.aboutInstitute}
            onChange={handleChange}
            className={styles.editorTextarea}
            placeholder="Write about your school / institute..."
          />
        </div>
      </div>

      {/* School-specific fields */}
      <div className={styles.schoolDetailsBox}>
        <h3 className={styles.schoolDetailsTitle}>
          School Details for Candidate Matching
        </h3>

        <div className={styles.fieldGrid}>
          <Field label="Total Student Strength">
            <Select
              options={studentCountOptions}
              value={formData.totalStudents}
              onChange={(v) => setField("totalStudents", v)}
              placeholder="Select total students"
            />
          </Field>

          <Field label="Students Per Class">
            <Select
              options={studentsPerClassOptions}
              value={formData.studentsPerClass}
              onChange={(v) => setField("studentsPerClass", v)}
              placeholder="Select students per class"
            />
          </Field>

          <Field label="School Timings / Working Hours">
            <Input
              value={formData.schoolTimings}
              onChange={(value) =>
                setFormData((prev) => ({
                  ...prev,
                  schoolTimings: value,
                }))
              }
              placeholder="e.g. 8:00 AM – 2:30 PM, Mon–Sat"
            />
          </Field>

          <Field label="Bus / Transport Service Available">
            <Select
              style={{ "--cst-input-focus": "#16a34a" }}
              options={busServiceOptions}
              value={formData.busService}
              onChange={(v) => setField("busService", v)}
              placeholder="Select option"
            />
          </Field>
        </div>
      </div>

      {/* School Photo Gallery */}
      <div>
        <label className={labelClass}>School Photos / Gallery</label>
        <p className={styles.galleryHint}>
          Upload up to 8 photos — a visual profile makes your school more
          attractive to candidates.
        </p>
        <label className={styles.uploadPhotosLabel}>
          <Camera size={16} />{" "}
          {galleryImagesValidating ? "Checking Photos..." : "Upload Photos"}
          <input
            type="file"
            hidden
            accept="image/*"
            multiple
            disabled={galleryImagesValidating}
            onChange={handleGalleryUpload}
          />
        </label>
        {galleryImagesError && (
          <p className={styles.errorText}>{galleryImagesError}</p>
        )}
        {galleryImages.length > 0 && (
          <div className={styles.galleryGrid}>
            {galleryImages.map((url, i) => (
              <div
                key={i}
                className={styles.galleryItem}
              >
                <img
                  src={url}
                  alt={`gallery-${i}`}
                  className={styles.galleryImg}
                />
                <button
                  type="button"
                  onClick={() =>
                    setGalleryImages((prev) =>
                      prev.filter((_, idx) => idx !== i),
                    )
                  }
                  className={styles.galleryRemoveBtn}
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // ─── Render Other Info ─────────────────────────────────────────────────────

  const renderOtherInfo = () => {
    const currentYear = new Date().getFullYear();
    const age = formData.establishedYear
      ? currentYear - parseInt(formData.establishedYear)
      : null;
    return (
      <div className={styles.sectionStack}>
        <h2 className={styles.sectionTitle}>Other Information</h2>

        <div className={styles.fieldGrid}>
          {/* Founded Since — replaced slider with dropdown */}
          <div>
            <Field label="Established / Founded Since *">
              <Select
                value={formData.establishedYear}
                onChange={(v) => setField("establishedYear", v)}
                placeholder="Select year of establishment"
                options={establishmentYears}
              />
            </Field>
            {age !== null && age > 0 && (
              <p className={styles.schoolAgeHint}>
                School age:{" "}
                <span className={styles.schoolAgeValue}>
                  {age} year{age !== 1 ? "s" : ""}
                </span>
              </p>
            )}
          </div>

          <Field label="Industry">
            <Select
              value={formData.industry}
              onChange={(v) => setField("industry", v)}
              options={industries}
            />
          </Field>

          <Field label="Medium">
            <Select
              value={formData.medium}
              onChange={(v) => setField("medium", v)}
              placeholder="Select Medium"
              options={mediums}
            />
          </Field>

          {/* Level — made mandatory */}
          <Field label="Level" required>
            <Select
              value={formData.level}
              onChange={(v) => setField("level", v)}
              placeholder="Select the Level"
              options={levels}
            />
            <p className={styles.fieldHelpText}>
              Mandatory — affects teacher matching.
            </p>
          </Field>

          {/* Board — visible prominently for matching */}
          <Field label="Board">
            <Select
              value={formData.board}
              onChange={(v) => {
                console.log("Board Changed =", v);
                setField("board", v);
              }}
              options={boards}
            />
            <p className={styles.fieldHelpText}>
              Board helps match the right teachers for your curriculum.
            </p>
          </Field>

          {/* Website field REMOVED from Other Info — it's in Basic Information already */}

          <div className={styles.colSpan2}>
            <Field label="Alternate Email">
              <Input
                value={formData.alternateEmail}
                onChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    alternateEmail: value,
                  }))
                }
                placeholder="alternate-email"
              />
            </Field>
          </div>
        </div>
      </div>
    );
  };

  // ─── Render Social Links ───────────────────────────────────────────────────

  const renderSocialLinks = () => (
    <div className={styles.sectionStack}>
      <h2 className={styles.sectionTitle}>Social Links</h2>

      <div className={styles.fieldGrid}>
        <Field label="Facebook">
          <Input
            value={formData.facebook}
            onChange={(value) =>
              setFormData((prev) => ({
                ...prev,
                facebook: value,
              }))
            }
            placeholder="https://facebook.com/yourschool"
          />
        </Field>
        {/* Twitter → renamed to X (Twitter) */}
        <Field label="X (Twitter)">
          <Input
            value={formData.twitter}
            onChange={(value) =>
              setFormData((prev) => ({
                ...prev,
                twitter: value,
              }))
            }
            placeholder="https://x.com/yourschool"
          />
        </Field>
        <div className={styles.colSpan2}>
          <Field label="LinkedIn">
            <Input
              value={formData.linkedin}
              onChange={(value) =>
                setFormData((prev) => ({
                  ...prev,
                  linkedin: value,
                }))
              }
              placeholder="https://linkedin.com/school/yourschool"
            />
          </Field>
        </div>
      </div>
    </div>
  );

  useEffect(() => {
    const pin = formData.postalCode.trim();
    if (!/^\d{6}$/.test(pin)) return;

    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- kicks off a fetch; loading/error state can't be derived during render
    setPincodeLoading(true);
    setPincodeError("");

    fetch(`https://api.postalpincode.in/pincode/${pin}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data[0].Status === "Success" && data[0].PostOffice?.length > 0) {
          const po = data[0].PostOffice[0];
          setFormData((p) => ({
            ...p,
            state: po.State,
            city: po.District,
            area: po.Name.replace(/\s*(S\.O|B\.O|H\.O)$/i, "").trim(),
          }));
        } else {
          setPincodeError("PIN code not found. Enter state & city manually.");
        }
      })
      .catch(() => {
        if (!cancelled)
          setPincodeError("Could not reach postal API. Enter manually.");
      })
      .finally(() => {
        if (!cancelled) setPincodeLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [formData.postalCode]);

  // Debounced area/locality search → India Post "postoffice" endpoint.
  useEffect(() => {
    const q = areaQuery.trim();
    if (q.length < 3) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- resets results when the debounced query becomes too short to search
      setAreaResults([]);
      setAreaError("");
      return;
    }

    let cancelled = false;
    setAreaLoading(true);
    setAreaError("");

    const timer = setTimeout(() => {
      fetch(`https://api.postalpincode.in/postoffice/${encodeURIComponent(q)}`)
        .then((r) => r.json())
        .then((data) => {
          if (cancelled) return;
          if (data[0].Status === "Success" && data[0].PostOffice?.length > 0) {
            setAreaResults(data[0].PostOffice.slice(0, 25));
            setShowAreaDropdown(true);
          } else {
            setAreaResults([]);
            setAreaError("No localities found. Try a different name.");
          }
        })
        .catch(() => {
          if (!cancelled) setAreaError("Could not reach postal API. Enter manually.");
        })
        .finally(() => {
          if (!cancelled) setAreaLoading(false);
        });
    }, 500);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [areaQuery]);

  const handleSelectLocality = (po) => {
    const cleanName = po.Name.replace(/\s*(S\.O|B\.O|H\.O)$/i, "").trim();
    setFormData((p) => ({
      ...p,
      area: cleanName,
      city: po.District,
      state: po.State,
      postalCode: po.Pincode,
    }));
    setAreaQuery(cleanName);
    setShowAreaDropdown(false);
    setAreaResults([]);
    setPincodeError("");
  };

  // ─── Render Address ────────────────────────────────────────────────────────

  const renderAddress = () => (
    <div className={styles.sectionStack}>
      <h2 className={styles.sectionTitle}>Address / Location</h2>

      {/* Locality search — type an area name, pick from results, everything fills */}
      <div className={styles.localitySearchBox}>
        <Field label="Search Area / Locality">
          <div className={styles.relativeWrap}>
            <Input
              value={areaQuery}
              onChange={(value) => {
                setAreaQuery(value);
                setAreaError("");
              }}
              onFocus={() => areaResults.length > 0 && setShowAreaDropdown(true)}
              placeholder="Type an area name, e.g. Rajendra Nagar (min 3 letters)"
              autoComplete="off"
            />
            {areaLoading && (
              <span className={styles.searchingLabel}>
                Searching…
              </span>
            )}

            {showAreaDropdown && areaResults.length > 0 && (
              <div className={styles.localityDropdown}>
                {areaResults.map((po, i) => (
                  <button
                    key={`${po.Name}-${po.Pincode}-${i}`}
                    type="button"
                    onClick={() => handleSelectLocality(po)}
                    className={styles.localityOption}
                  >
                    <span>
                      <span className={styles.localityName}>
                        {po.Name}
                      </span>
                      <span className={styles.localityMeta}>
                        {po.District}, {po.State}
                      </span>
                    </span>
                    <span className={styles.localityPincode}>
                      {po.Pincode}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
          {areaError ? (
            <p className={styles.errorText}>{areaError}</p>
          ) : (
            <p className={styles.helperText}>
              Select a locality and the City/District, State &amp; PIN code fill in automatically.
            </p>
          )}
        </Field>
      </div>

      <div className={styles.fieldGrid}>
        <Field label="Country">
          <Select
            value={formData.country}
            onChange={(v) => setField("country", v)}
            options={countries}
          />
        </Field>

        <Field label="Area / Locality">
          <Input
            value={formData.area}
            onChange={(value) =>
              setFormData((prev) => ({
                ...prev,
                area: value,
              }))
            }
            placeholder="e.g. Rajendra Nagar"
          />
        </Field>

        <Field label="City / District">
          <Input
            value={formData.city}
            onChange={(value) =>
              setFormData((prev) => ({
                ...prev,
                city: value,
              }))
            }
            placeholder="e.g. Indore"
          />
        </Field>

        <Field label="State">
          <Select
            value={formData.state}
            onChange={(v) => setField("state", v)}
            placeholder="Select State"
            options={indianStates}
          />
        </Field>

        {/* Postal code — also supports reverse autofill if typed directly */}
        <Field label="Postal / PIN Code" required>
          <div className={styles.relativeWrap}>
            <Input
              value={formData.postalCode}
              onChange={(value) => {
                setPincodeError("");
                setFormData((prev) => ({
                  ...prev,
                  postalCode: value,
                }));
              }}
              placeholder="e.g. 452012"
              maxLength={6}
            />
            {pincodeLoading && (
              <span className={styles.searchingLabel}>
                Fetching…
              </span>
            )}
          </div>
          {pincodeError ? (
            <p className={styles.errorText}>{pincodeError}</p>
          ) : (
            <p className={styles.fieldHelpText}>
              Auto-filled from locality search, or type a 6-digit PIN to fill the rest.
            </p>
          )}
        </Field>

        <div className={styles.colSpan2}>
          <Field label="Address Lane 1">
            <Input
              value={formData.addressLane1}
              onChange={(value) =>
                setFormData((prev) => ({
                  ...prev,
                  addressLane1: value,
                }))
              }
              placeholder="Flat / Building No., Building Name, Street"
            />
          </Field>
        </div>

        <div className={styles.colSpan2}>
          <Field label="Address Lane 2">
            <Input
              value={formData.addressLane2}
              onChange={(value) =>
                setFormData((prev) => ({
                  ...prev,
                  addressLane2: value,
                }))
              }
              placeholder="Area, Landmark (optional)"
            />
          </Field>
        </div>
      </div>
    </div>
  );

  const renderActiveSection = () => {
    if (activeSection === "other") return renderOtherInfo();
    if (activeSection === "social") return renderSocialLinks();
    if (activeSection === "address") return renderAddress();
    return renderBasicInfo();
  };

  // ─── Sidebar ───────────────────────────────────────────────────────────────

  const sidebarInner = (
    <div className={styles.sidebarInner}>
      <div className={styles.sidebarHeader}>
        <div className={styles.sidebarLogoBox}>
          {logoImage ? (
            <img
              src={logoImage}
              alt="logo"
              className={styles.sidebarLogoImg}
            />
          ) : (
            <Building2 size={22} className={styles.sidebarLogoIcon} />
          )}
        </div>
        <div className={styles.sidebarNameCol}>
          <p className={styles.sidebarSchoolName}>
            {schoolName}
          </p>
          <p className={styles.sidebarAccountLabel}>School Account</p>
        </div>
      </div>

      {/* Profile completion indicator */}
      <div className={styles.completionBox}>
        <div className={styles.completionRow}>
          <span>Profile Completion</span>
          <span className={styles.completionPct}>{completionPct}%</span>
        </div>
        <div className={styles.completionBarTrack}>
          <div
            className={styles.completionBarFill}
            style={{ width: `${completionPct}%` }}
          />
        </div>
        {completionPct < 100 && (
          <p className={styles.completionRemaining}>
            {100 - completionPct}% remaining to complete profile
          </p>
        )}
      </div>

      <nav className={styles.sidebarNav}>
        {sidebarItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.id === "companyProfile";
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleNavClick(item)}
              className={`${styles.navItem} ${isActive ? styles.navItemActive : ""}`}
            >
              <Icon size={17} />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className={styles.sidebarFooter}>
        <button
          type="button"
          onClick={() => navigate("/school/dashboard")}
          className={styles.footerNavItem}
        >
          <ArrowLeft size={17} /> Back to Dashboard
        </button>
        <button
          type="button"
          onClick={handleLogout}
          className={styles.footerNavItem}
        >
          <LogOut size={17} /> Logout
        </button>
        {/* Delete Profile moved to Settings page — no longer in sidebar */}
      </div>
    </div>
  );

  return (
    <div className={styles.pageWrap}>
      <form onSubmit={handleSubmit} className={styles.formLayout}>
        <aside className={styles.aside}>
          {sidebarInner}
        </aside>

        <main className={styles.main}>
          <div className={styles.headerCard}>
            <p className={styles.headerEyebrow}>
              Employer Workspace
            </p>
            <h1 className={styles.headerTitle}>
              School Profile
            </h1>
            <p className={styles.headerSubtitle}>
              Keep your school information up to date to attract the best
              candidates.
            </p>
          </div>

          <div className={styles.sectionNavDesktop}>
            {profileSections.map((section) => {
              const isActive = activeSection === section.id;
              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setActiveSection(section.id)}
                  className={`${styles.sectionTabBtn} ${isActive ? styles.sectionTabBtnActive : ""}`}
                >
                  {section.label}
                </button>
              );
            })}
          </div>

          <div className={styles.mobileNavWrap}>
            <div className={styles.mobileNavBar}>
              <span className={styles.mobileNavLabel}>
                {profileSections.find((section) => section.id === activeSection)?.label || "Menu"}
              </span>
              <button
                type="button"
                onClick={() => setMobileNavOpen((o) => !o)}
                aria-label="Toggle navigation menu"
                aria-expanded={mobileNavOpen}
                className={styles.mobileNavToggleBtn}
              >
                {mobileNavOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>

            {mobileNavOpen && (
              <div className={styles.mobileNavDropdown}>
                {profileSections.map((section) => {
                  const isActive = activeSection === section.id;
                  return (
                    <button
                      key={section.id}
                      type="button"
                      onClick={() => {
                        setActiveSection(section.id);
                        setMobileNavOpen(false);
                      }}
                      className={`${styles.mobileNavItem} ${isActive ? styles.mobileNavItemActive : ""}`}
                    >
                      {section.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className={styles.contentCard}>
            {renderActiveSection()}

            <div className={styles.formActions}>
              <Button variant="outlined" type="button">
                Cancel
              </Button>
              <Button
                type="submit"
                variant="filled"
                startIcon="saveIcon"
                disabled={profileLoading}
              >
                {profileLoading ? "Loading..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </main>
      </form>
    </div>
  );
};

export default SchoolProfile;
