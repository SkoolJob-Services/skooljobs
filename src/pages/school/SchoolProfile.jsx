import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../features/auth/AuthContext";
import { profileSections } from "../../lib/schooldata";
import profileOptions from "../../../dropdown/School_module/profile.json";
import { Button, Input, Select, useSnackbar } from "@cloudstrytech/ui-components";
import { toOptions } from "../../lib/selectOptions";
import styles from "./styles/SchoolProfile.module.css";
import {
  getMySchoolProfile,
  updateSchoolProfile,
} from "../../services/schoolProfileService";
import { useImageUpload } from "../../lib/useImageUpload";
import { DOCUMENT_TYPES, uploadDocumentRef } from "../../services/documentService";
import { DocumentImage } from "../../components/DocumentImage";
import { rememberSavedSchoolProfile, withRecentSave } from "../../features/school/ownSchoolProfile";
import { validateFields } from "../../lib/textValidation";
import {
  ArrowLeft,
  BriefcaseBusiness,
  Building2,
  Calendar,
  Camera,
  CreditCard,
  Eye,
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

// Dropdown labels that differ from the API's Board enum values.
const BOARD_API_VALUES = {
  "IB (International Baccalaureate)": "IB",
  "IGCSE / Cambridge": "IGCSE-Cambridge",
};
const BOARD_FORM_VALUES = Object.fromEntries(
  Object.entries(BOARD_API_VALUES).map(([form, api]) => [api, form]),
);

const sidebarItems = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    route: "/school/dashboard",
  },
  { id: "companyProfile", label: "Institute Profile", icon: Building2 },
  { id: "viewProfile", label: "View Profile", icon: Eye, route: "/school/view-profile" },
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
  { id: "interviews", label: "Interviews", icon: Calendar, route: "/school/interviews" },
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
  const { signOut } = useAuth();
  const snackbar = useSnackbar();
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
  // Logo, cover and gallery are stored in document-management; these hold "document:<id>" refs.
  const [imageUploading, setImageUploading] = useState({ logo: false, cover: false, gallery: false });
  const [imageUploadError, setImageUploadError] = useState({ logo: null, cover: null, gallery: null });
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

  const [formData, setFormData] = useState({
    firstName: currentUser.firstName || "",
    lastName: currentUser.lastName || "",
    companyName: currentUser.companyName || currentUser.schoolName || "",
    email: currentUser.email || "",
    publicView: "Yes",
    phone: currentUser.phone || "",
    website: "",
    sector: "Schools & Institutions",
    aboutInstitute: "",
    totalStudents: "",
    studentsPerClass: "",
    schoolTimings: "",
    busService: "",
    establishedYear: "",
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
  // Name shown in the sidebar: what is typed, else the saved name.
  const schoolName = formData.companyName || currentUser.companyName || currentUser.schoolName || "Your school";

  // The caller's own school comes from the server (GET /school-profiles/me),
  // never from localStorage. Save updates that school; schools are only created
  // by a ADMIN invitation, so there is no create from this page.
  const [loadError, setLoadError] = useState(false);
  const [loadedProfile, setLoadedProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  // Schools come only from invitations: no own school yet means "being set up".
  const [schoolPending, setSchoolPending] = useState(false);
  const [saving, setSaving] = useState(false);
  // Ref guard: blocks a second submit before the `saving` re-render lands.
  const savingRef = useRef(false);

  /** SchoolProfile (contract) → this form, its images and the loaded copy (Cancel goes back to it). */
  const applyProfile = (data) => {
    setLoadedProfile(data);
    const has = (v) => v !== undefined && v !== null && v !== "";
    const yesNo = (v) => (v === true ? "Yes" : v === false ? "No" : undefined);
    const mapped = {
      companyName: data.schoolName,
      sector: data.sector,
      schoolType: data.schoolType,
      affiliationStatus: data.affiliationStatus,
      board: BOARD_FORM_VALUES[data.board] || data.board,
      medium: data.medium,
      level: data.level,
      industry: data.industry,
      aboutInstitute: data.description,
      establishedYear: has(data.establishedYear) ? String(data.establishedYear) : undefined,
      totalStudents: data.totalStudents,
      studentsPerClass: data.studentsPerClass,
      schoolTimings: data.schoolTimings,
      busService: yesNo(data.busService),
      publicView: yesNo(data.publicView),
      email: data.contact?.email,
      phone: data.contact?.phone,
      website: data.contact?.website,
      alternateEmail: data.contact?.alternateEmail,
      postalCode: data.address?.pinCode,
      city: data.address?.city,
      state: data.address?.state,
      country: data.address?.country,
      area: data.address?.area,
      addressLane1: data.address?.addressLine1,
      addressLane2: data.address?.addressLine2,
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
    setLogoImage(has(data.logoUrl) ? data.logoUrl : null);
    setCoverImage(has(data.coverImageUrl) ? data.coverImageUrl : null);
    setGalleryImages(Array.isArray(data.galleryImageUrls) ? data.galleryImageUrls.filter(has) : []);
  };

  useEffect(() => {
    let cancelled = false;
    getMySchoolProfile()
      .then(({ data }) => {
        if (cancelled || !data) return;
        // A save from a moment ago may not be stored yet (202): show it on top.
        applyProfile(withRecentSave(data));
      })
      .catch((error) => {
        if (cancelled) return;
        if (error?.response?.status === 404) {
          // No school yet: it is claimed from the invitation shortly after signup.
          setSchoolPending(true);
        } else {
          console.error("Failed to load school profile:", error);
          setLoadError(true);
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

  // Checked files are uploaded to document-management straight away; "Save" then stores
  // their references in the profile (logoUrl, coverImageUrl, galleryImageUrls).
  const uploadSchoolImages = async (kind, files, documentType) => {
    const ownerId = loadedProfile?.schoolProfileId;
    if (!ownerId) {
      setImageUploadError((p) => ({ ...p, [kind]: "Your school is still being set up. Please try again in a moment." }));
      return [];
    }
    setImageUploadError((p) => ({ ...p, [kind]: null }));
    setImageUploading((p) => ({ ...p, [kind]: true }));
    try {
      const refs = [];
      for (const file of files) refs.push(await uploadDocumentRef({ ownerId, documentType, file }));
      return refs;
    } catch (error) {
      console.error(`Failed to upload ${kind} image:`, error);
      setImageUploadError((p) => ({ ...p, [kind]: "Couldn't upload the image. Please try again." }));
      return [];
    } finally {
      setImageUploading((p) => ({ ...p, [kind]: false }));
    }
  };

  /** Keeps only the files that passed the image checks (useImageUpload returns blob URLs for those). */
  const checkedFiles = (files, urls) => {
    urls.forEach((url) => URL.revokeObjectURL(url));
    return urls.length === files.length ? files : null;
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    const url = await validateLogoImage(file);
    if (!url) return;
    URL.revokeObjectURL(url);
    const [ref] = await uploadSchoolImages("logo", [file], DOCUMENT_TYPES.SCHOOL_LOGO);
    if (ref) setLogoImage(ref);
  };

  const handleCoverUpload = async (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    const url = await validateCoverImage(file);
    if (!url) return;
    URL.revokeObjectURL(url);
    const [ref] = await uploadSchoolImages("cover", [file], DOCUMENT_TYPES.SCHOOL_COVER_PHOTO);
    if (ref) setCoverImage(ref);
  };

  const handleGalleryUpload = async (e) => {
    const files = Array.from(e.target.files || []).slice(0, Math.max(0, 8 - galleryImages.length));
    e.target.value = "";
    if (files.length === 0) return;
    // Validate one by one so only the files that pass are uploaded.
    const passed = [];
    for (const file of files) {
      const urls = await validateGalleryImages([file]);
      if (checkedFiles([file], urls)) passed.push(file);
    }
    if (passed.length === 0) return;
    const refs = await uploadSchoolImages("gallery", passed, DOCUMENT_TYPES.SCHOOL_GALLERY_PHOTO);
    if (refs.length > 0) {
      setGalleryImages((prev) => [...prev, ...refs].slice(0, 8));
    }
  };

  const handleNavClick = (item) => {
    if (item.route) navigate(item.route);
  };

  // Ends the signup-service session (POST /auth/logout) and clears "currentUser".
  const handleLogout = async () => {
    // To the website home page first: ending the session while still on a protected page
    // would make its route guard send the user to /login instead.
    navigate("/", { replace: true });
    await signOut();
  };
  /** First problem in the whole form (every section is saved together): [section, message]. */
  const firstProblem = () => {
    if (!formData.companyName?.trim()) return ["basic", "Institute Name is required."];
    if (!formData.sector) return ["basic", "Sector is required."];
    const { valid, errors } = validateFields({ aboutInstitute: formData.aboutInstitute });
    if (!valid) return ["basic", Object.values(errors)[0]];
    if (!formData.level) return ["other", "Level is required as it directly affects job matching."];
    if (!formData.postalCode) return ["address", "Postal Code is required for job location matching."];
    return null;
  };

  const yesNoToBoolean = (value) => (value === "No" ? false : value ? true : null);

  /** This form → SchoolProfile (contract). Fields left empty are kept as they are by the service. */
  const formToPayload = () => ({
    schoolProfileId: loadedProfile?.schoolProfileId,
    schoolName: formData.companyName.trim(),
    sector: formData.sector,
    schoolType: formData.schoolType || loadedProfile?.schoolType || null,
    affiliationStatus: formData.affiliationStatus || loadedProfile?.affiliationStatus || null,
    board: BOARD_API_VALUES[formData.board] || formData.board || null,
    medium: formData.medium || null,
    level: formData.level || null,
    industry: formData.industry || null,
    establishedYear: formData.establishedYear ? Number(formData.establishedYear) : null,
    description: formData.aboutInstitute || null,
    totalStudents: formData.totalStudents || null,
    studentsPerClass: formData.studentsPerClass || null,
    schoolTimings: formData.schoolTimings || null,
    busService: yesNoToBoolean(formData.busService),
    publicView: yesNoToBoolean(formData.publicView),
    logoUrl: logoImage || null,
    coverImageUrl: coverImage || null,
    galleryImageUrls: galleryImages,
    contact: {
      email: formData.email || null,
      phone: formData.phone || null,
      website: formData.website || null,
      alternateEmail: formData.alternateEmail || null,
    },
    address: {
      pinCode: formData.postalCode || null,
      city: formData.city || null,
      state: formData.state || null,
      country: formData.country || null,
      area: formData.area || null,
      addressLine1: formData.addressLane1 || null,
      addressLine2: formData.addressLane2 || null,
    },
    socialLinks: {
      linkedin: formData.linkedin || null,
      facebook: formData.facebook || null,
      twitter: formData.twitter || null,
    },
  });

  const anyUploadRunning = imageUploading.logo || imageUploading.cover || imageUploading.gallery;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (savingRef.current || profileLoading) return;
    if (!loadedProfile?.schoolProfileId) {
      alert("Your school is still being set up from your invitation. Please refresh in a moment.");
      return;
    }
    if (anyUploadRunning) {
      alert("Please wait until the images have finished uploading.");
      return;
    }
    const problem = firstProblem();
    if (problem) {
      setActiveSection(problem[0]);
      alert(problem[1]);
      return;
    }

    const payload = formToPayload();
    savingRef.current = true;
    setSaving(true);
    try {
      // POST /school-profiles/update → 202: stored a moment later by the service.
      await updateSchoolProfile(payload);
      rememberSavedSchoolProfile({ ...loadedProfile, ...payload });
      setLoadedProfile({ ...loadedProfile, ...payload });
      snackbar.show({ message: "Profile saved.", type: "success" });
      navigate("/school/view-profile");
    } catch (error) {
      console.error("API Error:", error);
      // ErrorResponse { code, message } from the API, when present.
      const serverMessage = error?.response?.data?.message;
      alert(serverMessage ? `Failed to save profile: ${serverMessage}` : "Failed to save profile.");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  /** Discards the edits (back to the loaded profile) and leaves the editor. */
  const handleCancel = () => {
    if (loadedProfile) applyProfile(loadedProfile);
    navigate("/school/view-profile");
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
              <DocumentImage src={logoImage} alt="logo" className={styles.logoImg} />
            ) : (
              <Building2 size={32} className={styles.logoPlaceholderIcon} />
            )}
          </div>
          <label className={styles.uploadLogoLabel}>
            <Upload size={13} />{" "}
            {logoImageValidating
              ? "Checking..."
              : imageUploading.logo
                ? "Uploading..."
                : logoImage
                ? "Change Logo"
                : "Upload Logo"}
            <input
              type="file"
              hidden
              accept="image/*"
              disabled={logoImageValidating || imageUploading.logo}
              onChange={handleLogoUpload}
            />
          </label>
          <p className={styles.logoHint}>Recommended: 200×200px</p>
          {(logoImageError || imageUploadError.logo) && (
            <p className={styles.errorText}>{logoImageError || imageUploadError.logo}</p>
          )}
        </div>

        {/* Cover photo */}
        <div className={styles.coverCol}>
          <label className={styles.uploadCoverLabel}>
            <ImageIcon size={16} />{" "}
            {coverImageValidating ? "Checking..." : imageUploading.cover ? "Uploading..." : "Upload Cover Photo"}
            <input
              type="file"
              hidden
              accept="image/*"
              disabled={coverImageValidating || imageUploading.cover}
              onChange={handleCoverUpload}
            />
          </label>
          {(coverImageError || imageUploadError.cover) && (
            <p className={styles.errorText}>{coverImageError || imageUploadError.cover}</p>
          )}
          {coverImage && (
            <div className={styles.coverPreviewWrap}>
              <DocumentImage src={coverImage} alt="cover" className={styles.coverPreviewImg} />
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
          {galleryImagesValidating
            ? "Checking Photos..."
            : imageUploading.gallery
              ? "Uploading Photos..."
              : "Upload Photos"}
          <input
            type="file"
            hidden
            accept="image/*"
            multiple
            disabled={galleryImagesValidating || imageUploading.gallery || galleryImages.length >= 8}
            onChange={handleGalleryUpload}
          />
        </label>
        {(galleryImagesError || imageUploadError.gallery) && (
          <p className={styles.errorText}>{galleryImagesError || imageUploadError.gallery}</p>
        )}
        {galleryImages.length > 0 && (
          <div className={styles.galleryGrid}>
            {galleryImages.map((url, i) => (
              <div
                key={i}
                className={styles.galleryItem}
              >
                <DocumentImage
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
              onChange={(v) => setField("board", v)}
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
            <DocumentImage
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

  if (loadError) {
    return (
      <div className={styles.pageWrap} role="alert">
        <p>Couldn't load your school profile. Please check your connection and try again.</p>
        <Button type="button" onClick={() => window.location.reload()}>
          Try again
        </Button>
      </div>
    );
  }

  if (schoolPending) {
    return (
      <div className={styles.pageWrap} role="status">
        <p>Your school is being set up from your invitation. This can take a moment.</p>
        <Button type="button" onClick={() => window.location.reload()}>
          Refresh
        </Button>
      </div>
    );
  }

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
              <Button variant="outlined" type="button" onClick={handleCancel} disabled={saving}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="filled"
                startIcon="saveIcon"
                disabled={profileLoading || saving || loadError || anyUploadRunning}
              >
                {profileLoading ? "Loading..." : saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </main>
      </form>
    </div>
  );
};

export default SchoolProfile;
