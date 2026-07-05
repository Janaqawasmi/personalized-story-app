import { useEffect, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from "@mui/material";
import type { PurchaseFormat, ShippingDetails } from "../../types/commerce";
import {
  validateShippingDetails,
  type ShippingDetailsFieldErrors,
  type ShippingDetailsInput,
} from "../../utils/shippingDetailsValidation";
import { useTranslation } from "../../i18n/useTranslation";

interface PurchaseFormatDialogProps {
  open: boolean;
  onClose: () => void;
  /** shippingDetails is only ever provided when format === "print". */
  onSelect: (format: PurchaseFormat, shippingDetails?: ShippingDetails) => void | Promise<void>;
  currency: string;
  digitalPrice?: number;
  printPrice?: number;
  printAvailable: boolean;
  loadingFormat?: PurchaseFormat | null;
  loadingOptions?: boolean;
}

function formatMoney(amount: number | undefined, currency: string, comingSoonLabel: string): string {
  if (typeof amount !== "number" || !Number.isFinite(amount)) {
    return comingSoonLabel;
  }

  const c = currency.toUpperCase();
  if (c === "ILS") return `₪${amount}`;

  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: c }).format(amount);
  } catch {
    return `${currency} ${amount}`;
  }
}

function OptionCard({
  title,
  description,
  price,
  disabled,
  loading,
  onClick,
}: {
  title: string;
  description: string;
  price: string;
  disabled?: boolean;
  loading?: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      fullWidth
      variant="outlined"
      disabled={disabled || loading}
      onClick={onClick}
      sx={{
        justifyContent: "space-between",
        alignItems: "flex-start",
        textTransform: "none",
        borderRadius: "16px",
        px: 2,
        py: 1.75,
      }}
    >
      <Box sx={{ textAlign: "left", flex: 1 }}>
        <Typography sx={{ fontSize: 16, fontWeight: 700, color: "#3C1C28" }}>
          {title}
        </Typography>
        <Typography sx={{ fontSize: 13, color: "#9a8a92", mt: 0.5 }}>
          {description}
        </Typography>
      </Box>
      <Box sx={{ minWidth: 88, textAlign: "right", ml: 2 }}>
        {loading ? (
          <CircularProgress size={18} sx={{ color: "#824D5C" }} />
        ) : (
          <Typography sx={{ fontSize: 15, fontWeight: 700, color: "#824D5C" }}>
            {price}
          </Typography>
        )}
      </Box>
    </Button>
  );
}

const EMPTY_SHIPPING_FORM: ShippingDetailsInput = {
  fullName: "",
  phoneNumber: "",
  email: "",
  city: "",
  streetAddress: "",
  buildingOrHouseNumber: "",
  apartment: "",
  postalCode: "",
  deliveryNotes: "",
};

/** Prints the required-field asterisk consistently. */
function RequiredLabel({ children }: { children: string }) {
  return <>{children} *</>;
}

export default function PurchaseFormatDialog({
  open,
  onClose,
  onSelect,
  currency,
  digitalPrice,
  printPrice,
  printAvailable,
  loadingFormat = null,
  loadingOptions = false,
}: PurchaseFormatDialogProps) {
  const t = useTranslation();
  const [step, setStep] = useState<"format" | "shipping">("format");
  const [form, setForm] = useState<ShippingDetailsInput>(EMPTY_SHIPPING_FORM);
  const [errors, setErrors] = useState<ShippingDetailsFieldErrors>({});

  // Reset to a clean state every time the dialog opens, so a previous
  // purchase attempt never leaks into the next one.
  useEffect(() => {
    if (open) {
      setStep("format");
      setForm(EMPTY_SHIPPING_FORM);
      setErrors({});
    }
  }, [open]);

  const handleFieldChange = (field: keyof ShippingDetailsInput) => (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleShippingContinue = () => {
    const result = validateShippingDetails(form);
    if (!result.valid || !result.value) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    void onSelect("print", result.value);
  };

  const isSubmittingPrint = loadingFormat === "print";

  return (
    <Dialog open={open} onClose={loadingFormat ? undefined : onClose} fullWidth maxWidth="xs">
      {step === "format" ? (
        <>
          <DialogTitle sx={{ pb: 1 }}>{t("pages.purchaseFormat.title")}</DialogTitle>
          <DialogContent sx={{ pb: 3 }}>
            {loadingOptions ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                <CircularProgress sx={{ color: "#824D5C" }} />
              </Box>
            ) : (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, mt: 1 }}>
                <OptionCard
                  title={t("pages.purchaseFormat.digitalLabel")}
                  description={t("pages.purchaseFormat.digitalDescription")}
                  price={formatMoney(digitalPrice, currency, t("pages.purchaseFormat.comingSoon"))}
                  loading={loadingFormat === "digital"}
                  onClick={() => void onSelect("digital")}
                />
                <OptionCard
                  title={t("pages.purchaseFormat.printLabel")}
                  description={
                    printAvailable
                      ? t("pages.purchaseFormat.printDescriptionAvailable")
                      : t("pages.purchaseFormat.printDescriptionUnavailable")
                  }
                  price={
                    printAvailable
                      ? formatMoney(printPrice, currency, t("pages.purchaseFormat.comingSoon"))
                      : t("pages.purchaseFormat.comingSoon")
                  }
                  disabled={!printAvailable}
                  loading={false}
                  onClick={() => setStep("shipping")}
                />
              </Box>
            )}
          </DialogContent>
        </>
      ) : (
        <>
          <DialogTitle sx={{ pb: 0.5 }}>{t("pages.shipping.title")}</DialogTitle>
          <DialogContent sx={{ pb: 3 }}>
            <Typography sx={{ fontSize: 13, color: "#9a8a92", mb: 2 }}>
              {t("pages.shipping.subtitle")}
            </Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
              <TextField
                label={<RequiredLabel>{t("pages.shipping.fullNameLabel")}</RequiredLabel>}
                value={form.fullName}
                onChange={handleFieldChange("fullName")}
                error={!!errors.fullName}
                helperText={errors.fullName ? t(errors.fullName) : undefined}
                size="small"
                fullWidth
                disabled={isSubmittingPrint}
              />
              <TextField
                label={<RequiredLabel>{t("pages.shipping.phoneNumberLabel")}</RequiredLabel>}
                value={form.phoneNumber}
                onChange={handleFieldChange("phoneNumber")}
                error={!!errors.phoneNumber}
                helperText={errors.phoneNumber ? t(errors.phoneNumber) : undefined}
                size="small"
                fullWidth
                disabled={isSubmittingPrint}
              />
              <TextField
                label={t("pages.shipping.emailLabel")}
                value={form.email}
                onChange={handleFieldChange("email")}
                error={!!errors.email}
                helperText={errors.email ? t(errors.email) : undefined}
                size="small"
                fullWidth
                disabled={isSubmittingPrint}
              />
              <TextField
                label={<RequiredLabel>{t("pages.shipping.cityLabel")}</RequiredLabel>}
                value={form.city}
                onChange={handleFieldChange("city")}
                error={!!errors.city}
                helperText={errors.city ? t(errors.city) : undefined}
                size="small"
                fullWidth
                disabled={isSubmittingPrint}
              />
              <TextField
                label={<RequiredLabel>{t("pages.shipping.streetAddressLabel")}</RequiredLabel>}
                value={form.streetAddress}
                onChange={handleFieldChange("streetAddress")}
                error={!!errors.streetAddress}
                helperText={errors.streetAddress ? t(errors.streetAddress) : undefined}
                size="small"
                fullWidth
                disabled={isSubmittingPrint}
              />
              <Box sx={{ display: "flex", gap: 1.5 }}>
                <TextField
                  label={t("pages.shipping.buildingOrHouseNumberLabel")}
                  value={form.buildingOrHouseNumber}
                  onChange={handleFieldChange("buildingOrHouseNumber")}
                  size="small"
                  fullWidth
                  disabled={isSubmittingPrint}
                />
                <TextField
                  label={t("pages.shipping.apartmentLabel")}
                  value={form.apartment}
                  onChange={handleFieldChange("apartment")}
                  size="small"
                  fullWidth
                  disabled={isSubmittingPrint}
                />
              </Box>
              <TextField
                label={t("pages.shipping.postalCodeLabel")}
                value={form.postalCode}
                onChange={handleFieldChange("postalCode")}
                size="small"
                fullWidth
                disabled={isSubmittingPrint}
              />
              <TextField
                label={t("pages.shipping.deliveryNotesLabel")}
                value={form.deliveryNotes}
                onChange={handleFieldChange("deliveryNotes")}
                size="small"
                fullWidth
                multiline
                minRows={2}
                disabled={isSubmittingPrint}
              />

              <Box sx={{ display: "flex", gap: 1.5, mt: 1 }}>
                <Button
                  variant="outlined"
                  onClick={() => setStep("format")}
                  disabled={isSubmittingPrint}
                  sx={{ textTransform: "none", borderRadius: "12px" }}
                >
                  {t("pages.shipping.back")}
                </Button>
                <Button
                  variant="contained"
                  fullWidth
                  onClick={handleShippingContinue}
                  disabled={isSubmittingPrint}
                  sx={{
                    textTransform: "none",
                    borderRadius: "12px",
                    background: "#824D5C",
                    "&:hover": { background: "#6f404d" },
                  }}
                >
                  {isSubmittingPrint ? (
                    <CircularProgress size={18} sx={{ color: "#fff" }} />
                  ) : (
                    t("pages.shipping.continue")
                  )}
                </Button>
              </Box>
            </Box>
          </DialogContent>
        </>
      )}
    </Dialog>
  );
}
