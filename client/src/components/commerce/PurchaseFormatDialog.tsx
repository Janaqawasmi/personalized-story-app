import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Typography,
} from "@mui/material";
import type { PurchaseFormat } from "../../types/commerce";

interface PurchaseFormatDialogProps {
  open: boolean;
  onClose: () => void;
  onSelect: (format: PurchaseFormat) => void | Promise<void>;
  currency: string;
  digitalPrice?: number;
  printPrice?: number;
  printAvailable: boolean;
  loadingFormat?: PurchaseFormat | null;
  loadingOptions?: boolean;
}

function formatMoney(amount: number | undefined, currency: string): string {
  if (typeof amount !== "number" || !Number.isFinite(amount)) {
    return "Coming soon";
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
  return (
    <Dialog open={open} onClose={loadingFormat ? undefined : onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ pb: 1 }}>Which version do you want?</DialogTitle>
      <DialogContent sx={{ pb: 3 }}>
        {loadingOptions ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress sx={{ color: "#824D5C" }} />
          </Box>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, mt: 1 }}>
            <OptionCard
              title="Digital"
              description="Read online after purchase"
              price={formatMoney(digitalPrice, currency)}
              loading={loadingFormat === "digital"}
              onClick={() => onSelect("digital")}
            />
            <OptionCard
              title="Print"
              description={
                printAvailable
                  ? "Printed book prepared by DAMMAH team"
                  : "Print version coming soon"
              }
              price={printAvailable ? formatMoney(printPrice, currency) : "Coming soon"}
              disabled={!printAvailable}
              loading={loadingFormat === "print"}
              onClick={() => onSelect("print")}
            />
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}
