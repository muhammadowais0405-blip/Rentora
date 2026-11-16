import { useEffect, useState, type ChangeEvent } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle,
  Check,
  ImagePlus,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { AiListingDraft, Category } from '../types/marketplace';
import {
  createListing,
  generateAiDraft,
  getCategories,
  getItemDetail,
  updateListing,
  uploadListingImage,
} from '../lib/api';
import { formatPkr } from '../utils/rentalMath';
import { SafeImage } from '../components/common/SafeImage';

interface WizardImage {
  filePath: string;
  isCover: boolean;
  localFile?: File;
}

const STEPS = [
  { id: 1, label: '01. Details' },
  { id: 2, label: '02. Photos & AI' },
  { id: 3, label: '03. Pricing' },
  { id: 4, label: '04. Review' },
];

export function ListItemPage() {
  const { id } = useParams<{ id?: string }>();
  const isEditing = Boolean(id);
  const editId = id ? Number(id) : null;

  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(isEditing);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [categorySlug, setCategorySlug] = useState('cameras-photography');
  const [subcategory, setSubcategory] = useState('Mirrorless');
  const [condition, setCondition] = useState<'Like New' | 'Excellent' | 'Good'>('Excellent');
  const [description, setDescription] = useState('');
  const [ownerNotes, setOwnerNotes] = useState('');
  const [images, setImages] = useState<WizardImage[]>([]);
  const [dailyPrice, setDailyPrice] = useState('2000');
  const [depositAmount, setDepositAmount] = useState('8000');
  const [locationText, setLocationText] = useState('');
  const [includedGear, setIncludedGear] = useState('');

  // Upload & AI Draft state
  const [uploadingImage, setUploadingImage] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiDraft, setAiDraft] = useState<AiListingDraft | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getCategories()
      .then((cats) => {
        setCategories(cats);
      })
      .catch(() => {
        // Handled cleanly
      });
  }, []);

  useEffect(() => {
    if (!isEditing || !editId || !user) return;
    setLoadingInitial(true);
    getItemDetail(editId)
      .then((item) => {
        if (item.ownerId !== user.id && user.role !== 'admin') {
          setError('You can only edit your own listings.');
          return;
        }
        setTitle(item.title);
        setCategorySlug(item.categorySlug);
        setSubcategory(item.subcategory);
        setCondition((item.condition as 'Like New' | 'Excellent' | 'Good') || 'Excellent');
        setDescription(item.description);
        setDailyPrice(String(item.dailyPrice));
        setDepositAmount(String(item.depositAmount));
        setLocationText(item.locationText);
        setIncludedGear(item.specs.Included ?? '');
        setImages(
          item.images.map((img) => ({
            filePath: img.filePath,
            isCover: img.isCover,
          })),
        );
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Unable to load listing for editing.');
      })
      .finally(() => setLoadingInitial(false));
  }, [isEditing, editId, user]);

  if (authLoading || loadingInitial) {
    return (
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <div className="h-96 rounded-2xl bg-white border border-[#E2E8F0] animate-pulse" />
      </main>
    );
  }

  if (!user) {
    return <Navigate to={`/login?next=${encodeURIComponent(isEditing ? `/items/${id}/edit` : '/list-item')}`} replace />;
  }

  const activeCategory = categories.find((c) => c.slug === categorySlug);
  const availableSubcategories = activeCategory?.subcategories ?? ['General'];

  const handleCategoryChange = (nextSlug: string) => {
    setCategorySlug(nextSlug);
    const nextCat = categories.find((c) => c.slug === nextSlug);
    if (nextCat && nextCat.subcategories.length > 0) {
      setSubcategory(nextCat.subcategories[0]);
    }
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;

    setError(null);
    setUploadingImage(true);
    try {
      const remainingSlots = Math.max(0, 5 - images.length);
      const selected = files.slice(0, remainingSlots);
      const uploaded: WizardImage[] = [];

      for (const file of selected) {
        if (file.size > 5 * 1024 * 1024) {
          throw new Error(`"${file.name}" exceeds the 5 MB limit.`);
        }
        const filePath = await uploadListingImage(file);
        uploaded.push({
          filePath,
          isCover: images.length === 0 && uploaded.length === 0,
          localFile: file,
        });
      }
      setImages((prev) => [...prev, ...uploaded]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Photo upload failed.');
    } finally {
      setUploadingImage(false);
      event.target.value = '';
    }
  };

  const handleSetCover = (idx: number) => {
    setImages((prev) =>
      prev.map((img, i) => ({
        ...img,
        isCover: i === idx,
      })),
    );
  };

  const handleRemoveImage = (idx: number) => {
    setImages((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      if (next.length > 0 && !next.some((img) => img.isCover)) {
        next[0] = { ...next[0], isCover: true };
      }
      return next;
    });
  };

  const handleGenerateAiDraft = async () => {
    if (aiLoading) return;
    setAiError(null);
    setAiLoading(true);
    try {
      const cover = images.find((img) => img.isCover) ?? images[0];
      const draft = await generateAiDraft({
        imageFile: cover?.localFile,
        existingImagePath: cover?.filePath,
        ownerNotes: ownerNotes.trim() || [title, condition, includedGear].filter(Boolean).join('. '),
      });
      setAiDraft(draft);
    } catch (err) {
      setAiError(
        err instanceof Error ? err.message : 'AI Listing Generator failed. Please try again.',
      );
    } finally {
      setAiLoading(false);
    }
  };

  const applyAiDraftToForm = () => {
    if (!aiDraft) return;
    setTitle(aiDraft.suggestedTitle);
    setCategorySlug(aiDraft.suggestedCategorySlug);
    setSubcategory(aiDraft.suggestedSubcategory);
    setDescription(aiDraft.suggestedDescription);
    setAiDraft(null);
  };

  const validateStep = (currentStep: number): string | null => {
    if (currentStep === 1) {
      if (title.trim().length < 4) return 'Enter a clear listing title (at least 4 characters).';
      if (description.trim().length < 15) return 'Add a description of at least 15 characters.';
    }
    if (currentStep === 2) {
      if (images.length === 0) return 'Upload at least one item photo before continuing.';
    }
    if (currentStep === 3) {
      const priceNum = Number(dailyPrice);
      const depositNum = Number(depositAmount);
      if (!Number.isFinite(priceNum) || priceNum < 100) {
        return 'Daily rental price must be at least Rs. 100.';
      }
      if (!Number.isFinite(depositNum) || depositNum < 0) {
        return 'Security deposit must be Rs. 0 or higher.';
      }
      if (locationText.trim().length < 3) {
        return 'Enter a pickup neighborhood or city.';
      }
    }
    return null;
  };

  const handleNextStep = () => {
    const validationErr = validateStep(step);
    if (validationErr) {
      setError(validationErr);
      return;
    }
    setError(null);
    setStep((s) => Math.min(4, s + 1));
  };

  const handleSubmitListing = async () => {
    for (const s of [1, 2, 3]) {
      const errMsg = validateStep(s);
      if (errMsg) {
        setStep(s);
        setError(errMsg);
        return;
      }
    }

    setSubmitting(true);
    setError(null);
    try {
      const specs: Record<string, string> = includedGear.trim()
        ? { Included: includedGear.trim() }
        : {};
      const payload = {
        title: title.trim(),
        categorySlug,
        subcategory: subcategory.trim() || 'General',
        description: description.trim(),
        condition,
        dailyPrice: Math.round(Number(dailyPrice)),
        depositAmount: Math.round(Number(depositAmount)),
        locationText: locationText.trim(),
        specs,
        images: images.map((img) => ({ filePath: img.filePath, isCover: img.isCover })),
      };

      if (isEditing && editId) {
        await updateListing(editId, payload);
        navigate('/my-listings');
      } else {
        await createListing(payload);
        navigate('/my-listings');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save listing.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <div className="mb-8">
        <p className="text-xs font-semibold text-[#0F766E]">
          {isEditing ? 'Edit Demo Listing' : 'Owner Listing Wizard'}
        </p>
        <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold text-[#172554]">
          {isEditing ? 'Update your rental listing' : 'List an item on Rentora'}
        </h1>
        <p className="mt-1.5 text-sm text-[#64748B]">
          New listings save to SQLite as pending demo items and can be previewed or edited in My
          Listings.
        </p>
      </div>

      {/* Stepper */}
      <nav aria-label="Listing creation steps" className="mb-8">
        <ol className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-1.5 bg-[#F1F5F9] rounded-2xl">
          {STEPS.map((item) => {
            const active = step === item.id;
            const completed = step > item.id;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => {
                    if (item.id < step) {
                      setError(null);
                      setStep(item.id);
                    }
                  }}
                  className={`w-full px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap ${
                    active
                      ? 'bg-white text-[#172554] shadow-xs'
                      : completed
                        ? 'text-[#0F766E] hover:bg-white/60 cursor-pointer'
                        : 'text-[#64748B] cursor-default'
                  }`}
                >
                  {item.label}
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      {error && (
        <div
          role="alert"
          className="mb-6 rounded-xl bg-[#FEF2F2] p-4 text-sm text-[#B91C1C] flex items-start gap-2.5"
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      <div className="rounded-2xl bg-white border border-[#E2E8F0] p-6 sm:p-8">
        {/* Step 1: Basic Details */}
        {step === 1 && (
          <div className="space-y-5">
            <h2 className="font-display text-xl font-bold text-[#172554]">Basic item details</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="listing-category"
                  className="block text-xs font-semibold text-[#475569] mb-1.5"
                >
                  Category
                </label>
                <select
                  id="listing-category"
                  value={categorySlug}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-sm text-[#0F172A]"
                >
                  <option value="cameras-photography">Cameras &amp; Photography</option>
                  <option value="gaming-consoles">Gaming Consoles</option>
                  <option value="bikes-cycles">Bikes &amp; Cycles</option>
                  <option value="electronics-equipment">Electronics &amp; Equipment</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="listing-subcategory"
                  className="block text-xs font-semibold text-[#475569] mb-1.5"
                >
                  Subcategory
                </label>
                <select
                  id="listing-subcategory"
                  value={subcategory}
                  onChange={(e) => setSubcategory(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-sm text-[#0F172A]"
                >
                  {availableSubcategories.map((sub) => (
                    <option key={sub} value={sub}>
                      {sub}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label
                htmlFor="listing-title"
                className="block text-xs font-semibold text-[#475569] mb-1.5"
              >
                Item title
              </label>
              <input
                id="listing-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Fujifilm X-T30 II Mirrorless Camera + 18-55mm Kit"
                className="w-full h-11 px-3.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-sm text-[#0F172A]"
              />
            </div>

            <div>
              <label
                htmlFor="listing-condition"
                className="block text-xs font-semibold text-[#475569] mb-1.5"
              >
                Condition
              </label>
              <select
                id="listing-condition"
                value={condition}
                onChange={(e) =>
                  setCondition(e.target.value as 'Like New' | 'Excellent' | 'Good')
                }
                className="w-full h-11 px-3.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-sm text-[#0F172A]"
              >
                <option value="Like New">Like New</option>
                <option value="Excellent">Excellent</option>
                <option value="Good">Good</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="listing-description"
                className="block text-xs font-semibold text-[#475569] mb-1.5"
              >
                Description
              </label>
              <textarea
                id="listing-description"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what the item is best suited for, included accessories, and pickup notes."
                className="w-full p-3.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-sm text-[#0F172A]"
              />
            </div>
          </div>
        )}

        {/* Step 2: Photos & AI Listing Generator */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="font-display text-xl font-bold text-[#172554]">
                Photos &amp; AI Listing Generator
              </h2>
              <p className="mt-1 text-sm text-[#64748B]">
                Upload 1 to 5 photos (JPG, PNG, or WEBP up to 5 MB). Optionally generate an
                editable listing draft with AI.
              </p>
            </div>

            <div className="rounded-2xl border-2 border-dashed border-[#CBD5E1] bg-[#F8FAFC] p-6 text-center">
              <ImagePlus className="w-8 h-8 text-[#0F766E] mx-auto" aria-hidden="true" />
              <p className="mt-2 text-sm font-medium text-[#0F172A]">
                Select product photos from your device
              </p>
              <p className="mt-1 text-xs text-[#64748B]">
                JPG, PNG, WEBP · Max 5 MB per photo · {images.length}/5 uploaded
              </p>
              <label className="mt-4 inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-[#0F766E] hover:bg-[#0D5F59] text-white text-sm font-semibold transition-colors cursor-pointer">
                <span>{uploadingImage ? 'Uploading...' : 'Choose photos'}</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  disabled={uploadingImage || images.length >= 5}
                  onChange={handleFileChange}
                  className="sr-only"
                />
              </label>
            </div>

            {images.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {images.map((img, idx) => (
                  <div
                    key={img.filePath + idx}
                    className="rounded-xl border border-[#E2E8F0] overflow-hidden bg-white"
                  >
                    <div className="aspect-[4/3] bg-[#F1F5F9]">
                      <SafeImage src={img.filePath} alt={`Uploaded listing photo ${idx + 1}`} />
                    </div>
                    <div className="p-2.5 flex items-center justify-between gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => handleSetCover(idx)}
                        className={`font-semibold cursor-pointer ${
                          img.isCover ? 'text-[#0F766E]' : 'text-[#64748B] hover:text-[#172554]'
                        }`}
                      >
                        {img.isCover ? 'Cover photo' : 'Set as cover'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(idx)}
                        aria-label={`Remove photo ${idx + 1}`}
                        className="p-1 rounded text-[#B91C1C] hover:bg-[#FEF2F2] cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* AI Listing Generator Panel */}
            <div className="pt-6 border-t border-[#E2E8F0] space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold text-[#172554]">
                <Sparkles className="w-4 h-4 text-[#14B8A6]" aria-hidden="true" />
                <span>AI Listing Generator (Optional Assistant)</span>
              </div>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Add any known brand, model, or included accessories below, then click Generate with
                AI. Suggestions are never saved automatically—you review and edit every field.
              </p>

              <div>
                <label
                  htmlFor="ai-owner-notes"
                  className="block text-xs font-semibold text-[#475569] mb-1.5"
                >
                  Owner notes for AI (optional)
                </label>
                <input
                  id="ai-owner-notes"
                  type="text"
                  value={ownerNotes}
                  onChange={(e) => setOwnerNotes(e.target.value)}
                  placeholder="e.g., Canon DSLR with 50mm lens, two batteries, and padded bag"
                  className="w-full h-11 px-3.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-sm text-[#0F172A]"
                />
              </div>

              <button
                type="button"
                disabled={aiLoading}
                onClick={handleGenerateAiDraft}
                className="px-5 py-2.5 rounded-xl bg-[#172554] hover:bg-[#1E3A5F] disabled:opacity-60 text-white text-sm font-semibold transition-colors inline-flex items-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-[#5EEAD4]" aria-hidden="true" />
                <span>{aiLoading ? 'Analyzing photo & notes...' : 'Generate with AI'}</span>
              </button>

              {aiError && (
                <div
                  role="alert"
                  className="rounded-xl bg-[#FEF2F2] p-3.5 text-xs text-[#B91C1C] flex items-center justify-between gap-3"
                >
                  <span>{aiError}</span>
                  <button
                    type="button"
                    onClick={handleGenerateAiDraft}
                    className="font-semibold underline shrink-0 cursor-pointer"
                  >
                    Try again
                  </button>
                </div>
              )}

              {aiDraft && (
                <div className="rounded-2xl bg-[#F0FDFA] border border-[#99F6E4] p-5 space-y-3">
                  <p className="text-xs font-semibold text-[#0F766E]">
                    AI suggestion — review before applying to your listing
                  </p>
                  <div className="text-sm space-y-1.5 text-[#0F172A]">
                    <p>
                      <span className="font-semibold">Suggested title:</span>{' '}
                      {aiDraft.suggestedTitle}
                    </p>
                    <p>
                      <span className="font-semibold">Category:</span>{' '}
                      {aiDraft.suggestedCategorySlug} · {aiDraft.suggestedSubcategory}
                    </p>
                    <p>
                      <span className="font-semibold">Description:</span>{' '}
                      {aiDraft.suggestedDescription}
                    </p>
                    {aiDraft.visibleAttributes.length > 0 && (
                      <p className="text-xs text-[#475569]">
                        <span className="font-semibold">Visible in photo:</span>{' '}
                        {aiDraft.visibleAttributes.join(' · ')}
                      </p>
                    )}
                  </div>
                  <div className="pt-2 flex flex-wrap gap-2.5">
                    <button
                      type="button"
                      onClick={applyAiDraftToForm}
                      className="px-4 py-2 rounded-xl bg-[#0F766E] hover:bg-[#0D5F59] text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Apply suggestions to form</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setAiDraft(null)}
                      className="px-4 py-2 rounded-xl bg-white border border-[#E2E8F0] text-xs font-semibold text-[#475569] hover:text-[#0F172A] cursor-pointer"
                    >
                      Discard suggestion
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Pricing & Pickup Details */}
        {step === 3 && (
          <div className="space-y-5">
            <div>
              <h2 className="font-display text-xl font-bold text-[#172554]">
                Rental pricing &amp; pickup location
              </h2>
              <p className="mt-1 text-sm text-[#64748B]">
                Owners always set and confirm the daily PKR price and illustrative security deposit.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="listing-daily-price"
                  className="block text-xs font-semibold text-[#475569] mb-1.5"
                >
                  Daily rental price (PKR)
                </label>
                <input
                  id="listing-daily-price"
                  type="number"
                  min={100}
                  step={50}
                  value={dailyPrice}
                  onChange={(e) => setDailyPrice(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-sm tabular-nums text-[#0F172A]"
                />
              </div>

              <div>
                <label
                  htmlFor="listing-deposit"
                  className="block text-xs font-semibold text-[#475569] mb-1.5"
                >
                  Refundable deposit — demo only (PKR)
                </label>
                <input
                  id="listing-deposit"
                  type="number"
                  min={0}
                  step={500}
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-sm tabular-nums text-[#0F172A]"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="listing-location"
                className="block text-xs font-semibold text-[#475569] mb-1.5"
              >
                Pickup area / city
              </label>
              <input
                id="listing-location"
                type="text"
                value={locationText}
                onChange={(e) => setLocationText(e.target.value)}
                placeholder="e.g., Gulberg III, Lahore"
                className="w-full h-11 px-3.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-sm text-[#0F172A]"
              />
            </div>

            <div>
              <label
                htmlFor="listing-included"
                className="block text-xs font-semibold text-[#475569] mb-1.5"
              >
                Included accessories (optional)
              </label>
              <input
                id="listing-included"
                type="text"
                value={includedGear}
                onChange={(e) => setIncludedGear(e.target.value)}
                placeholder="e.g., Carry bag, 2 batteries, charger, 64GB SD card"
                className="w-full h-11 px-3.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-sm text-[#0F172A]"
              />
            </div>
          </div>
        )}

        {/* Step 4: Review & Submit */}
        {step === 4 && (
          <div className="space-y-6">
            <div>
              <h2 className="font-display text-xl font-bold text-[#172554]">
                Review your demo listing
              </h2>
              <p className="mt-1 text-sm text-[#64748B]">
                Confirm the details below before saving to the local SQLite database.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
              <div className="md:col-span-5 aspect-[4/3] rounded-xl overflow-hidden bg-[#F1F5F9]">
                <SafeImage
                  src={(images.find((i) => i.isCover) ?? images[0])?.filePath ?? ''}
                  alt={title || 'Listing preview'}
                />
              </div>
              <div className="md:col-span-7 space-y-2.5 text-sm">
                <p className="text-xs text-[#64748B]">
                  {activeCategory?.name ?? categorySlug} · {subcategory} · {condition}
                </p>
                <h3 className="font-display text-xl font-bold text-[#172554]">{title}</h3>
                <p className="text-[#475569] leading-relaxed">{description}</p>
                <div className="pt-2 flex flex-wrap gap-x-6 gap-y-2 text-sm">
                  <span>
                    Daily rate:{' '}
                    <strong className="font-display tabular-nums text-[#172554]">
                      {formatPkr(Number(dailyPrice))} / day
                    </strong>
                  </span>
                  <span>
                    Deposit (demo):{' '}
                    <strong className="tabular-nums text-[#0F172A]">
                      {formatPkr(Number(depositAmount))}
                    </strong>
                  </span>
                </div>
                <p className="text-xs text-[#64748B]">Pickup: {locationText}</p>
              </div>
            </div>
          </div>
        )}

        {/* Wizard Footer Controls */}
        <div className="mt-8 pt-6 border-t border-[#E2E8F0] flex items-center justify-between gap-4">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => {
                setError(null);
                setStep((s) => s - 1);
              }}
              className="px-5 py-2.5 rounded-xl border border-[#E2E8F0] text-sm font-semibold text-[#172554] hover:bg-[#F1F5F9] transition-colors cursor-pointer"
            >
              Back
            </button>
          ) : (
            <Link
              to="/my-listings"
              className="text-sm font-semibold text-[#64748B] hover:text-[#172554]"
            >
              Cancel
            </Link>
          )}

          {step < 4 ? (
            <button
              type="button"
              onClick={handleNextStep}
              className="px-6 py-2.5 rounded-xl bg-[#0F766E] hover:bg-[#0D5F59] text-white text-sm font-semibold transition-colors cursor-pointer"
            >
              Continue
            </button>
          ) : (
            <button
              type="button"
              disabled={submitting}
              onClick={handleSubmitListing}
              className="px-6 py-2.5 rounded-xl bg-[#0F766E] hover:bg-[#0D5F59] disabled:opacity-60 text-white text-sm font-semibold transition-colors cursor-pointer"
            >
              {submitting
                ? 'Saving...'
                : isEditing
                  ? 'Save listing changes'
                  : 'Submit demo listing'}
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
