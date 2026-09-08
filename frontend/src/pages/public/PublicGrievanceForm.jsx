import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { publicGrievanceApi } from '../../services/api/api';
import { getLocationTree } from '../../constants/localtions.constants';
import { getApiError } from '../../services/api/axios.services';
import '../../styles/PublicGrievanceForm.css';

const matchId = (a, b) => String(a) === String(b);

const MOBILE_MAX = 10;
const AADHAAR_MAX = 12;
const NAME_MAX = 255;
const NAME_MIN = 2;
const ADDRESS_MIN = 5;
const SUBJECT_MIN = 3;
const SUBJECT_MAX = 255;
const FILE_MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_FILE_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png'];
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png'];

const digitsOnly = (value, max) => String(value || '').replace(/\D/g, '').slice(0, max);

const isAllowedFile = (file) => {
  if (!file) return false;
  const name = file.name.toLowerCase();
  return ALLOWED_FILE_EXTENSIONS.some((ext) => name.endsWith(ext));
};

const isImageFile = (file) => {
  if (!file) return false;
  const name = file.name.toLowerCase();
  return IMAGE_EXTENSIONS.some((ext) => name.endsWith(ext));
};

const Section = ({ icon, titleEn, titleOdia, children }) => (
  <div className="pg-section">
    <div className="pg-section-title">
      <i className={icon} />
      <span>{titleEn} / {titleOdia}</span>
    </div>
    <div className="pg-section-body">{children}</div>
  </div>
);

const Field = ({ labelEn, labelOdia, required, full, error, children }) => (
  <div className={full ? 'pg-field-full' : ''}>
    <label className="pg-label">
      {labelEn} ({labelOdia}) {required && <span className="required">*</span>}
    </label>
    {children}
    {error && <p className="pg-field-error">{error}</p>}
  </div>
);

const PublicGrievanceForm = () => {
  const fileInputRef = useRef(null);
  const previewUrlRef = useRef(null);

  const [locationTree, setLocationTree] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isQuickMode, setIsQuickMode] = useState(false);

  const [jurisdictionType, setJurisdictionType] = useState('block');
  const [stateId, setStateId] = useState('');
  const [districtId, setDistrictId] = useState('');
  const [blockId, setBlockId] = useState('');
  const [gpId, setGpId] = useState('');
  const [villageId, setVillageId] = useState('');
  const [municipalityId, setMunicipalityId] = useState('');
  const [wardId, setWardId] = useState('');
  const [localityId, setLocalityId] = useState('');

  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [aadhaar, setAadhaar] = useState('');
  const [permanentAddress, setPermanentAddress] = useState('');
  const [locationDescription, setLocationDescription] = useState('');
  const [gpsLat, setGpsLat] = useState('');
  const [gpsLng, setGpsLng] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState('');
  const [declaration, setDeclaration] = useState(false);

  const [loadingLocations, setLoadingLocations] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [success, setSuccess] = useState(null);

  const selectedState = useMemo(
    () => locationTree.find((s) => matchId(s.id, stateId)) || null,
    [locationTree, stateId],
  );
  const districts = useMemo(() => selectedState?.districts || [], [selectedState]);
  const selectedDistrict = useMemo(
    () => districts.find((d) => matchId(d.id, districtId)) || null,
    [districts, districtId],
  );
  const blocks = useMemo(() => selectedDistrict?.blocks || [], [selectedDistrict]);
  const municipalities = useMemo(() => selectedDistrict?.municipalities || [], [selectedDistrict]);
  const selectedBlock = useMemo(() => blocks.find((b) => matchId(b.id, blockId)) || null, [blocks, blockId]);
  const gramPanchayats = useMemo(() => selectedBlock?.gram_panchayats || [], [selectedBlock]);
  const selectedGp = useMemo(() => gramPanchayats.find((g) => matchId(g.id, gpId)) || null, [gramPanchayats, gpId]);
  const blockVillages = useMemo(() => {
    if (!selectedBlock) return [];
    if (gramPanchayats.length > 0) return selectedGp?.villages || [];
    return selectedBlock.villages || [];
  }, [selectedBlock, gramPanchayats.length, selectedGp]);
  const selectedMunicipality = useMemo(
    () => municipalities.find((m) => matchId(m.id, municipalityId)) || null,
    [municipalities, municipalityId],
  );
  const wards = useMemo(() => selectedMunicipality?.wards || [], [selectedMunicipality]);
  const selectedWard = useMemo(() => wards.find((w) => matchId(w.id, wardId)) || null, [wards, wardId]);
  const localities = useMemo(() => selectedWard?.localities || [], [selectedWard]);
  const hasBlockJurisdictionData = blocks.length > 0;
  const hasMunicipalityJurisdictionData = municipalities.length > 0;

  const clearFieldError = (field) => {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const resetAreaFields = () => {
    setBlockId('');
    setGpId('');
    setVillageId('');
    setMunicipalityId('');
    setWardId('');
    setLocalityId('');
  };

  const revokePreviewUrl = () => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
  };

  const clearFile = () => {
    revokePreviewUrl();
    setFile(null);
    setFilePreviewUrl('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const inputClass = (field) => `pg-input${fieldErrors[field] ? ' pg-input-invalid' : ''}`;
  const selectClass = (field) => `pg-select${fieldErrors[field] ? ' pg-input-invalid' : ''}`;
  const textareaClass = (field) => `pg-textarea${fieldErrors[field] ? ' pg-input-invalid' : ''}`;

  useEffect(() => {
    const init = async () => {
      setLoadingLocations(true);
      try {
        const [locRes, catRes] = await Promise.all([
          getLocationTree(),
          publicGrievanceApi.getCategories(),
        ]);
        setLocationTree(locRes?.data || []);
        setCategories(catRes?.data || []);
      } catch (err) {
        setError(getApiError(err).message || 'Failed to load form data');
      } finally {
        setLoadingLocations(false);
      }
    };
    init();
  }, []);

  useEffect(() => () => revokePreviewUrl(), []);

  const handleJurisdictionChange = (type) => {
    setJurisdictionType(type);
    resetAreaFields();
    clearFieldError('blockId');
    clearFieldError('municipalityId');
  };

  const handleStateChange = (e) => {
    const val = e.target.value;
    setStateId(val);
    clearFieldError('stateId');
    setDistrictId('');
    resetAreaFields();
  };

  const handleDistrictChange = (e) => {
    const val = e.target.value;
    setDistrictId(val);
    clearFieldError('districtId');
    resetAreaFields();
  };

  const handleBlockChange = (e) => {
    setBlockId(e.target.value);
    setGpId('');
    setVillageId('');
    clearFieldError('blockId');
  };

  const handleGpChange = (e) => {
    setGpId(e.target.value);
    setVillageId('');
  };

  const handleMunicipalityChange = (e) => {
    setMunicipalityId(e.target.value);
    setWardId('');
    setLocalityId('');
    clearFieldError('municipalityId');
  };

  const handleWardChange = (e) => {
    setWardId(e.target.value);
    setLocalityId('');
  };

  const handleQuickModeChange = (quick) => {
    setIsQuickMode(quick);
    clearFieldError('categoryId');
    clearFieldError('subject');
    clearFieldError('file');
    if (quick) {
      setCategoryId('');
      setSubject('');
      setDescription('');
    } else {
      clearFile();
    }
  };

  const handleUseLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsLat(String(pos.coords.latitude));
        setGpsLng(String(pos.coords.longitude));
      },
      () => setError('Unable to retrieve your location.'),
    );
  };

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0] || null;
    clearFieldError('file');

    if (!selected) {
      clearFile();
      return;
    }

    if (!isAllowedFile(selected)) {
      setFieldErrors((prev) => ({
        ...prev,
        file: 'Only PDF, JPG, JPEG, and PNG files are allowed.',
      }));
      clearFile();
      return;
    }

    if (selected.size > FILE_MAX_BYTES) {
      setFieldErrors((prev) => ({
        ...prev,
        file: 'File size must not exceed 10 MB.',
      }));
      clearFile();
      return;
    }

    revokePreviewUrl();
    setFile(selected);
    if (isImageFile(selected)) {
      const url = URL.createObjectURL(selected);
      previewUrlRef.current = url;
      setFilePreviewUrl(url);
    } else {
      setFilePreviewUrl('');
    }
  };

  const validateForm = () => {
    const errors = {};
    const name = fullName.trim();
    const address = permanentAddress.trim();
    const mobileDigits = digitsOnly(mobile, MOBILE_MAX);
    const aadhaarDigits = digitsOnly(aadhaar, AADHAAR_MAX);

    if (!name) errors.fullName = 'Full name is required.';
    else if (name.length < NAME_MIN) errors.fullName = `Full name must be at least ${NAME_MIN} characters.`;
    else if (name.length > NAME_MAX) errors.fullName = `Full name cannot exceed ${NAME_MAX} characters.`;

    if (!mobileDigits) errors.mobile = 'Mobile number is required.';
    else if (!/^\d{10}$/.test(mobileDigits)) errors.mobile = 'Mobile number must be exactly 10 digits.';

    if (aadhaarDigits && !/^\d{12}$/.test(aadhaarDigits)) {
      errors.aadhaar = 'Aadhaar number must be exactly 12 digits.';
    }

    if (!address) errors.permanentAddress = 'Permanent address is required.';
    else if (address.length < ADDRESS_MIN) errors.permanentAddress = `Address must be at least ${ADDRESS_MIN} characters.`;

    if (!stateId) errors.stateId = 'Please select a state.';
    if (!districtId) errors.districtId = 'Please select a district.';

    if (jurisdictionType === 'block') {
      if (!blockId) errors.blockId = 'Please select a block.';
    } else if (!municipalityId) {
      errors.municipalityId = 'Please select a municipality.';
    }

    if (isQuickMode) {
      if (!file) errors.file = 'Please upload a photo or document.';
    } else {
      if (!categoryId) errors.categoryId = 'Please select a grievance category.';
      const title = subject.trim();
      if (!title) errors.subject = 'Subject is required.';
      else if (title.length < SUBJECT_MIN) errors.subject = `Subject must be at least ${SUBJECT_MIN} characters.`;
      else if (title.length > SUBJECT_MAX) errors.subject = `Subject cannot exceed ${SUBJECT_MAX} characters.`;
    }

    if (!declaration) errors.declaration = 'You must accept the declaration.';

    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const errors = validateForm();
    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      setError('Please correct the highlighted fields.');
      return;
    }
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('submission_type', isQuickMode ? 'quick' : 'full');
      formData.append('full_name', fullName.trim());
      formData.append('mobile_number', digitsOnly(mobile, MOBILE_MAX));
      if (digitsOnly(aadhaar, AADHAAR_MAX)) formData.append('aadhaar_or_voter_id', digitsOnly(aadhaar, AADHAAR_MAX));
      formData.append('permanent_address', permanentAddress.trim());
      formData.append('jurisdiction_type', jurisdictionType);
      formData.append('state_id', stateId);
      formData.append('district_id', districtId);

      if (jurisdictionType === 'block') {
        formData.append('block_id', blockId);
        if (gpId) formData.append('gram_panchayat_id', gpId);
        if (villageId) formData.append('village_id', villageId);
      } else {
        formData.append('municipality_id', municipalityId);
        if (wardId) formData.append('ward_id', wardId);
        if (localityId) formData.append('locality_id', localityId);
      }

      if (locationDescription.trim()) formData.append('location_description', locationDescription.trim());
      if (gpsLat) formData.append('gps_latitude', gpsLat);
      if (gpsLng) formData.append('gps_longitude', gpsLng);

      if (isQuickMode) {
        if (file) formData.append('file', file);
      } else {
        formData.append('category_id', categoryId);
        formData.append('subject', subject.trim());
        if (description.trim()) formData.append('description', description.trim());
        if (file) formData.append('file', file);
      }

      formData.append('declaration_accepted', 'true');

      const res = await publicGrievanceApi.submit(formData);
      if (res?.success) {
        setSuccess(res.data);
      } else {
        throw new Error(res?.message || 'Submission failed');
      }
    } catch (err) {
      setError(getApiError(err).message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="public-grievance-page">
        <div className="public-grievance-container">
          <div className="pg-success-card">
            <h2>Grievance Submitted Successfully / ଅଭିଯୋଗ ସଫଳତାର ସହିତ ଦାଖଲ ହେଲା</h2>
            <p>Please save your ticket number for future reference.</p>
            <div className="pg-ticket-no">{success.public_ticket_no}</div>
            <div className="pg-success-actions">
              <Link
                to={`/track-grievance?ticket=${encodeURIComponent(success.public_ticket_no)}`}
                className="pg-btn-outline"
              >
                Track Application
              </Link>
              <Link to="/login" className="pg-btn-outline">
                Go to Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="public-grievance-page">
      <div className="public-grievance-container">
        <div className="public-grievance-header">
          <h1>Submit Grievance / ଅଭିଯୋଗ ଦାଖଲ</h1>
          <p>MLA Connect — Public Grievance Portal</p>
          <p className="public-grievance-track-link">
            <Link to="/track-grievance">Already submitted? Track your application →</Link>
          </p>
        </div>

        {error && <div className="pg-error">{error}</div>}

        <form onSubmit={handleSubmit} noValidate>
          <Section icon="fa-solid fa-user" titleEn="Personal Details" titleOdia="ବ୍ୟକ୍ତିଗତ ବିବରଣୀ">
            <Field labelEn="Full Name" labelOdia="ପୁରା ନାମ" required error={fieldErrors.fullName}>
              <input
                className={inputClass('fullName')}
                value={fullName}
                maxLength={NAME_MAX}
                onChange={(e) => { setFullName(e.target.value); clearFieldError('fullName'); }}
                placeholder="As per official documents / ପ୍ରମାଣପତ୍ର ଅନୁଯାୟୀ"
              />
            </Field>
            <Field labelEn="Mobile Number" labelOdia="ମୋବାଇଲ୍ ନମ୍ବର" required error={fieldErrors.mobile}>
              <div className="pg-phone-row">
                <input className="pg-input pg-phone-prefix" value="+91" readOnly tabIndex={-1} />
                <input
                  className={inputClass('mobile')}
                  value={mobile}
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  maxLength={MOBILE_MAX}
                  onChange={(e) => { setMobile(digitsOnly(e.target.value, MOBILE_MAX)); clearFieldError('mobile'); }}
                  placeholder="10-digit number / ୧୦-ଅଙ୍କ ବିଶିଷ୍ଟ ନମ୍ବର"
                />
              </div>
            </Field>
            <Field labelEn="Aadhaar Number" labelOdia="ଆଧାର ନମ୍ବର" error={fieldErrors.aadhaar}>
              <input
                className={inputClass('aadhaar')}
                value={aadhaar}
                type="text"
                inputMode="numeric"
                autoComplete="off"
                maxLength={AADHAAR_MAX}
                onChange={(e) => { setAadhaar(digitsOnly(e.target.value, AADHAAR_MAX)); clearFieldError('aadhaar'); }}
                placeholder="12-digit Aadhaar / ୧୨-ଅଙ୍କ ବିଶିଷ୍ଟ ଆଧାର"
              />
            </Field>
            <Field labelEn="Permanent Address" labelOdia="ସ୍ଥାୟୀ ଠିକଣା" required full error={fieldErrors.permanentAddress}>
              <textarea
                className={textareaClass('permanentAddress')}
                rows={3}
                value={permanentAddress}
                onChange={(e) => { setPermanentAddress(e.target.value); clearFieldError('permanentAddress'); }}
                placeholder="Street, house, landmark name / ଗ୍ରାମ, ଘର, ଚିହ୍ନଟ ସ୍ଥାନ"
              />
            </Field>
          </Section>

          <Section icon="fa-solid fa-location-dot" titleEn="Grievance Jurisdiction & Location" titleOdia="ଅଭିଯୋଗ ଅଧିକାର କ୍ଷେତ୍ର ଏବଂ ସ୍ଥାନ">
            <div className="pg-field-full">
              <label className="pg-label">Jurisdiction Type / ଅଧିକାର କ୍ଷେତ୍ର <span className="required">*</span></label>
              <div className="pg-jurisdiction-toggle">
                <button
                  type="button"
                  className={jurisdictionType === 'block' ? 'active' : ''}
                  onClick={() => handleJurisdictionChange('block')}
                >
                  Block / ବ୍ଲକ
                </button>
                <button
                  type="button"
                  className={jurisdictionType === 'municipality' ? 'active' : ''}
                  onClick={() => handleJurisdictionChange('municipality')}
                >
                  Municipality / ପୌରପାଳିକା
                </button>
              </div>
            </div>

            <Field labelEn="State" labelOdia="ରାଜ୍ୟ" required error={fieldErrors.stateId}>
              <select className={selectClass('stateId')} value={stateId} onChange={handleStateChange} disabled={loadingLocations}>
                <option value="">{loadingLocations ? 'Loading...' : 'Select State'}</option>
                {locationTree.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </Field>
            <Field labelEn="District" labelOdia="ଜିଲ୍ଲା" required error={fieldErrors.districtId}>
              <select className={selectClass('districtId')} value={districtId} onChange={handleDistrictChange} disabled={!stateId}>
                <option value="">Select District</option>
                {districts.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </Field>

            {jurisdictionType === 'block' && districtId && (
              <>
                <Field labelEn="Block" labelOdia="ବ୍ଲକ" required error={fieldErrors.blockId}>
                  <select className={selectClass('blockId')} value={blockId} onChange={handleBlockChange} disabled={!hasBlockJurisdictionData}>
                    <option value="">{hasBlockJurisdictionData ? 'Select Block' : 'No blocks listed for this district'}</option>
                    {blocks.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </Field>
                {blockId && gramPanchayats.length > 0 && (
                  <Field labelEn="Gram Panchayat" labelOdia="ଗ୍ରାମ ପଞ୍ଚାୟତ">
                    <select className="pg-select" value={gpId} onChange={handleGpChange}>
                      <option value="">Select Gram Panchayat</option>
                      {gramPanchayats.map((g) => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                      ))}
                    </select>
                  </Field>
                )}
                {blockId && blockVillages.length > 0 && (
                  <Field labelEn="Village" labelOdia="ଗ୍ରାମ">
                    <select className="pg-select" value={villageId} onChange={(e) => setVillageId(e.target.value)} disabled={gramPanchayats.length > 0 && !gpId}>
                      <option value="">{gramPanchayats.length > 0 && !gpId ? 'Select Gram Panchayat first' : 'Select Village'}</option>
                      {blockVillages.map((v) => (
                        <option key={v.id} value={v.id}>{v.name}</option>
                      ))}
                    </select>
                  </Field>
                )}
              </>
            )}

            {jurisdictionType === 'municipality' && districtId && (
              <>
                <Field labelEn="Municipality" labelOdia="ପୌରପାଳିକା" required error={fieldErrors.municipalityId}>
                  <select className={selectClass('municipalityId')} value={municipalityId} onChange={handleMunicipalityChange} disabled={!hasMunicipalityJurisdictionData}>
                    <option value="">{hasMunicipalityJurisdictionData ? 'Select Municipality' : 'No municipalities listed for this district'}</option>
                    {municipalities.map((m) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </Field>
                {municipalityId && wards.length > 0 && (
                  <Field labelEn="Ward" labelOdia="ୱାର୍ଡ">
                    <select className="pg-select" value={wardId} onChange={handleWardChange}>
                      <option value="">Select Ward</option>
                      {wards.map((w) => (
                        <option key={w.id} value={w.id}>{w.name}</option>
                      ))}
                    </select>
                  </Field>
                )}
                {wardId && localities.length > 0 && (
                  <Field labelEn="Locality" labelOdia="ଅଞ୍ଚଳ">
                    <select className="pg-select" value={localityId} onChange={(e) => setLocalityId(e.target.value)}>
                      <option value="">Select Locality</option>
                      {localities.map((l) => (
                        <option key={l.id} value={l.id}>{l.name}</option>
                      ))}
                    </select>
                  </Field>
                )}
              </>
            )}

            <Field labelEn="Location Description" labelOdia="ସମସ୍ୟାର ସ୍ଥାନ ବିବରଣୀ" full>
              <textarea
                className="pg-textarea"
                rows={3}
                value={locationDescription}
                onChange={(e) => setLocationDescription(e.target.value)}
                placeholder="e.g. Near village school boundary wall / ଉଦାହରଣ: ସ୍କୁଲ ପାଚେରୀ ନିକଟରେ"
              />
            </Field>
            <div className="pg-field-full">
              <div className="pg-gps-row">
                <button type="button" className="pg-btn-outline" onClick={handleUseLocation}>
                  <i className="fa-solid fa-location-crosshairs" /> Use Current Location / ବର୍ତ୍ତମାନର ସ୍ଥାନ ବ୍ୟବହାର କରନ୍ତୁ
                </button>
                <input className="pg-input pg-gps-input" readOnly value={gpsLat && gpsLng ? `${gpsLat}, ${gpsLng}` : ''} placeholder="GPS Coordinates (Auto-filled) / ଜିପିଏସ୍ କୋଅର୍ଡିନେଟ୍" />
              </div>
            </div>
          </Section>

          <Section icon="fa-solid fa-file-lines" titleEn="Grievance Details" titleOdia="ଅଭିଯୋଗ ବିବରଣୀ">
            <div className="pg-field-full">
              <label className="pg-label">Submission Type / ଦାଖଲ ପ୍ରକାର</label>
              <div className="pg-jurisdiction-toggle">
                <button
                  type="button"
                  className={!isQuickMode ? 'active' : ''}
                  onClick={() => handleQuickModeChange(false)}
                >
                  Full Form / ସମ୍ପୂର୍ଣ୍ଣ ଫର୍ମ
                </button>
                <button
                  type="button"
                  className={isQuickMode ? 'active' : ''}
                  onClick={() => handleQuickModeChange(true)}
                >
                  Quick Grievance / ଦ୍ରୁତ ଅଭିଯୋଗ
                </button>
              </div>
            </div>

            {isQuickMode ? (
              <Field labelEn="Upload Photo or Document" labelOdia="ଫଟୋ କିମ୍ବା ଡକ୍ୟୁମେଣ୍ଟ ଅପଲୋଡ୍" required full error={fieldErrors.file}>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="pg-file-input-hidden"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileChange}
                />
                <button
                  type="button"
                  className="pg-upload-btn"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <i className="fa-solid fa-upload" /> Upload Photo or Document / ଫଟୋ କିମ୍ବା ଡକ୍ୟୁମେଣ୍ଟ ଅପଲୋଡ୍ କରନ୍ତୁ
                </button>

                {file && (
                  <div className="pg-file-preview">
                    {filePreviewUrl ? (
                      <img src={filePreviewUrl} alt="Upload preview" className="pg-file-preview-image" />
                    ) : (
                      <div className="pg-file-preview-pdf">
                        <i className="fa-solid fa-file-pdf" />
                        <span>{file.name}</span>
                      </div>
                    )}
                    <button type="button" className="pg-file-remove-btn" onClick={clearFile}>
                      <i className="fa-solid fa-xmark" /> Remove
                    </button>
                  </div>
                )}

                <p className="pg-quick-hint">
                  Just upload a photo — no title, description, or category needed. / କେବଳ ଫଟୋ ଅପଲୋଡ୍ କରନ୍ତୁ — ଶୀର୍ଷକ, ବର୍ଣ୍ଣନା କିମ୍ବା ଶ୍ରେଣୀ ଆବଶ୍ୟକ ନାହିଁ।
                </p>
              </Field>
            ) : (
              <>
                <Field labelEn="Grievance Category" labelOdia="ଅଭିଯୋଗ ଶ୍ରେଣୀ" required full error={fieldErrors.categoryId}>
                  <select className={selectClass('categoryId')} value={categoryId} onChange={(e) => { setCategoryId(e.target.value); clearFieldError('categoryId'); }}>
                    <option value="">Select Category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </Field>
                <Field labelEn="Subject / Title" labelOdia="ବିଷୟ / ଶୀର୍ଷକ" required full error={fieldErrors.subject}>
                  <input
                    className={inputClass('subject')}
                    value={subject}
                    maxLength={SUBJECT_MAX}
                    onChange={(e) => { setSubject(e.target.value); clearFieldError('subject'); }}
                    placeholder="Summary of the issue / ସମସ୍ୟାର ସଂକ୍ଷିପ୍ତ ସାରାଂଶ"
                  />
                </Field>
                <Field labelEn="Detailed Description" labelOdia="ବିସ୍ତୃତ ବିବରଣୀ" full>
                  <textarea className="pg-textarea" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Explain the problem clearly... / ସମସ୍ୟାଟି ସ୍ପଷ୍ଟ ଭାବରେ ବର୍ଣ୍ଣନା କରନ୍ତୁ..." />
                </Field>
                <Field labelEn="Supporting Evidence (Photos / Scans)" labelOdia="ସହାୟକ ପ୍ରମାଣ - ଫଟୋ" full error={fieldErrors.file}>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="pg-file-input-hidden"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFileChange}
                  />
                  <button
                    type="button"
                    className="pg-upload-btn pg-upload-btn-secondary"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <i className="fa-solid fa-upload" /> Upload Photo or Document (Optional) / ଫଟୋ ଅପଲୋଡ୍ (ଐଚ୍ଛିକ)
                  </button>

                  {file && (
                    <div className="pg-file-preview">
                      {filePreviewUrl ? (
                        <img src={filePreviewUrl} alt="Upload preview" className="pg-file-preview-image" />
                      ) : (
                        <div className="pg-file-preview-pdf">
                          <i className="fa-solid fa-file-pdf" />
                          <span>{file.name}</span>
                        </div>
                      )}
                      <button type="button" className="pg-file-remove-btn" onClick={clearFile}>
                        <i className="fa-solid fa-xmark" /> Remove
                      </button>
                    </div>
                  )}
                </Field>
              </>
            )}

            <div className="pg-field-full">
              <div className="pg-warning">
                <strong>Important Warning regarding Attachments:</strong> Do not upload AI-generated or modified images. If found, your application will be automatically rejected. / ଗୁରୁତ୍ଵପୂର୍ଣ୍ଣ ସୂଚନା: ଏଆଇ (AI) ଦ୍ୱାରା ପ୍ରସ୍ତୁତ କିମ୍ବା ପରିବର୍ତ୍ତିତ ଫଟୋ ଅପଲୋଡ୍ କରନ୍ତୁ ନାହିଁ।
              </div>
            </div>
          </Section>

          <Section icon="fa-solid fa-check-double" titleEn="Declaration & Submit" titleOdia="ଘୋଷଣା ଏବଂ ଦାଖଲ">
            <div className="pg-field-full pg-declaration">
              <input
                type="checkbox"
                id="declaration"
                checked={declaration}
                onChange={(e) => { setDeclaration(e.target.checked); clearFieldError('declaration'); }}
              />
              <label htmlFor="declaration">
                I hereby declare that the information provided above is true and correct to the best of my knowledge. I understand that providing false information may lead to rejection or legal action. / ମୁଁ ଘୋଷଣା କରୁଛି ଯେ ଉପରେ ଦିଆଯାଇଥିବା ସମସ୍ତ ସୂଚନା ସତ୍ୟ। ମିଥ୍ୟା ସୂଚନା ଦେଲେ ଆବେଦନ ପ୍ରତ୍ୟାଖ୍ୟାନ ହୋଇପାରେ।
              </label>
            </div>
            {fieldErrors.declaration && <p className="pg-field-error pg-field-full">{fieldErrors.declaration}</p>}
            <div className="pg-field-full">
              <button type="submit" className="pg-submit-btn" disabled={submitting}>
                {submitting ? 'Submitting...' : 'Submit Grievance / ଅଭିଯୋଗ ଦାଖଲ'}
              </button>
            </div>
          </Section>
        </form>
      </div>
    </div>
  );
};

export default PublicGrievanceForm;
