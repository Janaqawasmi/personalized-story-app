import { useEffect, useMemo, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TableSortLabel from "@mui/material/TableSortLabel";
import Typography from "@mui/material/Typography";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase";
import type {
  FinalPromptArtefact,
  ImageArtefact,
  ScenePlanArtefact,
  VisualBibleArtefact,
} from "../../types/illustration";
import { STORIES_COLLECTION } from "../../types/story";
import { useIllustrationDevPanelsGate } from "../hooks/useIsAdminOrDevPanelEnabled";

type ArtefactRow = {
  id: string;
  pageLabel: string;
  kind: string;
  version: number;
  createdAt: number;
  sourceModel: string;
  meta: string;
  json: unknown;
};

type SortKey = "page" | "kind" | "version" | "createdAt";

export default function IllustrationDebugPage() {
  const { lang = "he", storyId = "" } = useParams<{ lang: string; storyId: string }>();
  const { ready: gateReady, allowed } = useIllustrationDevPanelsGate();
  const [vbs, setVbs] = useState<VisualBibleArtefact[]>([]);
  const [sps, setSps] = useState<ScenePlanArtefact[]>([]);
  const [fps, setFps] = useState<FinalPromptArtefact[]>([]);
  const [imgs, setImgs] = useState<ImageArtefact[]>([]);
  const [sortBy, setSortBy] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [jsonOpen, setJsonOpen] = useState<unknown | null>(null);

  useEffect(() => {
    if (!storyId || !allowed || !gateReady) return () => undefined;
    const u1 = onSnapshot(collection(db, STORIES_COLLECTION, storyId, "visualBibles"), (snap) => {
      const list: VisualBibleArtefact[] = [];
      snap.forEach((d) => list.push(d.data() as VisualBibleArtefact));
      setVbs(list);
    });
    const u2 = onSnapshot(collection(db, STORIES_COLLECTION, storyId, "scenePlans"), (snap) => {
      const list: ScenePlanArtefact[] = [];
      snap.forEach((d) => list.push(d.data() as ScenePlanArtefact));
      setSps(list);
    });
    const u3 = onSnapshot(collection(db, STORIES_COLLECTION, storyId, "finalPrompts"), (snap) => {
      const list: FinalPromptArtefact[] = [];
      snap.forEach((d) => list.push(d.data() as FinalPromptArtefact));
      setFps(list);
    });
    const u4 = onSnapshot(collection(db, STORIES_COLLECTION, storyId, "images"), (snap) => {
      const list: ImageArtefact[] = [];
      snap.forEach((d) => list.push(d.data() as ImageArtefact));
      setImgs(list);
    });
    return () => {
      u1();
      u2();
      u3();
      u4();
    };
  }, [storyId, allowed, gateReady]);

  const rows = useMemo((): ArtefactRow[] => {
    const out: ArtefactRow[] = [];
    for (const v of vbs) {
      out.push({
        id: `vb-${v.version}`,
        pageLabel: "—",
        kind: "VB",
        version: v.version,
        createdAt: v.createdAt,
        sourceModel: v.source,
        meta: v.llmCall?.model ?? "—",
        json: v,
      });
    }
    for (const s of sps) {
      out.push({
        id: `sp-${s.pageNumber}-${s.version}`,
        pageLabel: String(s.pageNumber),
        kind: "Scene Plan",
        version: s.version,
        createdAt: s.createdAt,
        sourceModel: s.llmCall.model,
        meta: `VB v${s.visualBibleVersion}`,
        json: s,
      });
    }
    for (const f of fps) {
      out.push({
        id: `fp-${f.pageNumber}-${f.version}`,
        pageLabel: String(f.pageNumber),
        kind: "Final Prompt",
        version: f.version,
        createdAt: f.createdAt,
        sourceModel: "assembler",
        meta: `${f.charCount} chars`,
        json: f,
      });
    }
    for (const i of imgs) {
      out.push({
        id: `im-${i.pageNumber}-${i.version}`,
        pageLabel: String(i.pageNumber),
        kind: "Image",
        version: i.version,
        createdAt: i.createdAt,
        sourceModel: `${i.providerId}/${i.modelId}`,
        meta: i.reviewStatus,
        json: i,
      });
    }
    return out;
  }, [vbs, sps, fps, imgs]);

  const sorted = useMemo(() => {
    const mult = sortDir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      switch (sortBy) {
        case "page":
          return mult * (a.pageLabel.localeCompare(b.pageLabel, undefined, { numeric: true }) || 0);
        case "kind":
          return mult * a.kind.localeCompare(b.kind);
        case "version":
          return mult * (a.version - b.version);
        case "createdAt":
        default:
          return mult * (a.createdAt - b.createdAt);
      }
    });
  }, [rows, sortBy, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortBy === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(key);
      setSortDir(key === "createdAt" ? "desc" : "asc");
    }
  };

  if (!storyId) {
    return <Navigate to={`/${lang}/specialist/stories`} replace />;
  }
  if (!gateReady) {
    return (
      <Box sx={{ px: 3, py: 4 }}>
        <Typography variant="body2" color="text.secondary">
          Loading…
        </Typography>
      </Box>
    );
  }
  if (!allowed) {
    return <Navigate to={`/${lang}/specialist/stories/${storyId}`} replace />;
  }

  return (
    <Box sx={{ px: { xs: 2, sm: 3, md: 5 }, py: 4 }}>
      <Stack spacing={2}>
        <Typography variant="h6">Illustration debug — {storyId}</Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sortDirection={sortBy === "page" ? sortDir : false}>
                <TableSortLabel
                  active={sortBy === "page"}
                  direction={sortBy === "page" ? sortDir : "asc"}
                  onClick={() => toggleSort("page")}
                >
                  Page
                </TableSortLabel>
              </TableCell>
              <TableCell sortDirection={sortBy === "kind" ? sortDir : false}>
                <TableSortLabel
                  active={sortBy === "kind"}
                  direction={sortBy === "kind" ? sortDir : "asc"}
                  onClick={() => toggleSort("kind")}
                >
                  Artefact
                </TableSortLabel>
              </TableCell>
              <TableCell sortDirection={sortBy === "version" ? sortDir : false}>
                <TableSortLabel
                  active={sortBy === "version"}
                  direction={sortBy === "version" ? sortDir : "asc"}
                  onClick={() => toggleSort("version")}
                >
                  Version
                </TableSortLabel>
              </TableCell>
              <TableCell sortDirection={sortBy === "createdAt" ? sortDir : false}>
                <TableSortLabel
                  active={sortBy === "createdAt"}
                  direction={sortBy === "createdAt" ? sortDir : "asc"}
                  onClick={() => toggleSort("createdAt")}
                >
                  Created
                </TableSortLabel>
              </TableCell>
              <TableCell>Source / model</TableCell>
              <TableCell>Status / meta</TableCell>
              <TableCell align="right">Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sorted.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{r.pageLabel}</TableCell>
                <TableCell>{r.kind}</TableCell>
                <TableCell>{r.version}</TableCell>
                <TableCell>{new Date(r.createdAt).toLocaleString()}</TableCell>
                <TableCell>{r.sourceModel}</TableCell>
                <TableCell>{r.meta}</TableCell>
                <TableCell align="right">
                  <Button size="small" onClick={() => setJsonOpen(r.json)}>
                    View JSON
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Stack>

      <Dialog open={jsonOpen !== null} onClose={() => setJsonOpen(null)} fullWidth maxWidth="md">
        <DialogTitle>Artefact JSON</DialogTitle>
        <DialogContent>
          <Typography variant="caption" component="pre" sx={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
            {jsonOpen !== null ? JSON.stringify(jsonOpen, null, 2) : ""}
          </Typography>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
