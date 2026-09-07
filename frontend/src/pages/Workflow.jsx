import { useEffect, useState } from "react";
import { api, formatApiError } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus, MoreVertical, Trash2, Pencil, Calendar, AlertCircle, CheckCircle2,
  ListTodo, User, Columns, AlertTriangle
} from "lucide-react";
import { formatDate, daysUntil } from "@/lib/format";

const COLUMN_COLORS = {
  zinc: { bg: "bg-zinc-900/40", border: "border-zinc-800", text: "text-zinc-400", dot: "bg-zinc-400" },
  amber: { bg: "bg-amber-950/15", border: "border-amber-900/30", text: "text-amber-400", dot: "bg-amber-400" },
  blue: { bg: "bg-blue-950/15", border: "border-blue-900/30", text: "text-blue-400", dot: "bg-blue-400" },
  emerald: { bg: "bg-emerald-950/15", border: "border-emerald-900/30", text: "text-emerald-400", dot: "bg-emerald-400" },
  purple: { bg: "bg-purple-950/15", border: "border-purple-900/30", text: "text-purple-400", dot: "bg-purple-400" },
  rose: { bg: "bg-rose-950/15", border: "border-rose-900/30", text: "text-rose-400", dot: "bg-rose-400" },
};

const PRIORITIES = {
  low: { label: "Düşük", cls: "bg-secondary text-muted-foreground border-border" },
  medium: { label: "Orta", cls: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  high: { label: "Yüksek", cls: "bg-expense/15 text-expense border-expense/30 font-semibold" },
};

const emptyTaskForm = {
  title: "",
  description: "",
  stage: "pending",
  priority: "medium",
  due_date: new Date().toISOString().slice(0, 10),
  customer_name: "",
};

export default function Workflow() {
  const [columns, setColumns] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Active column for mobile view
  const [activeMobileCol, setActiveMobileCol] = useState(null);

  // Task Dialog
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyTaskForm);
  const [editingTaskId, setEditingTaskId] = useState(null);

  // Custom Column Dialog
  const [colDialogOpen, setColDialogOpen] = useState(false);
  const [colForm, setColForm] = useState({ title: "", color: "purple" });
  const [editingColId, setEditingColId] = useState(null);

  // Column Delete Dialog state
  const [deleteColTarget, setDeleteColTarget] = useState(null);
  const [deletingCol, setDeletingCol] = useState(false);

  // Drag & drop state
  const [draggedTaskId, setDraggedTaskId] = useState(null);
  const [dragOverStage, setDragOverStage] = useState(null);

  const loadData = async () => {
    try {
      const [colRes, taskRes] = await Promise.all([
        api.get("/kanban/columns"),
        api.get("/tasks"),
      ]);
      const fetchedCols = colRes.data || [];
      setColumns(fetchedCols);
      setTasks(taskRes.data || []);
      if (!activeMobileCol && fetchedCols.length > 0) {
        setActiveMobileCol(fetchedCols[0].key);
      }
    } catch (err) {
      toast.error(formatApiError(err, "İş akışı verileri yüklenemedi"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Task submit (create or update)
  const handleTaskSubmit = async () => {
    if (!form.title.trim()) return toast.error("Görev başlığı zorunludur");
    if (!form.due_date) return toast.error("Teslim tarihi seçilmelidir");

    const defaultStage = columns[0]?.key || "pending";
    const payload = {
      ...form,
      stage: form.stage || defaultStage,
    };

    try {
      if (editingTaskId) {
        await api.patch(`/tasks/${editingTaskId}`, payload);
        toast.success("Görev güncellendi");
      } else {
        await api.post("/tasks", payload);
        toast.success("Yeni görev eklendi");
      }
      setOpen(false);
      setForm(emptyTaskForm);
      setEditingTaskId(null);
      loadData();
    } catch (err) {
      toast.error(formatApiError(err, "Kaydedilemedi"));
    }
  };

  // Task delete
  const handleDeleteTask = async (id, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const targetId = String(id || "").trim();
    if (!targetId) return;

    // Optimistic instantaneous UI update
    setTasks((prev) => prev.filter((t) => String(t.id || t._id || "").trim() !== targetId));
    try {
      await api.delete(`/tasks/${encodeURIComponent(targetId)}`);
      toast.success("Görev silindi");
      loadData();
    } catch (err) {
      toast.error(formatApiError(err, "Silinemedi"));
      loadData();
    }
  };

  // Stage change via dropdown or drag & drop
  const handleStageChange = async (taskId, newStage) => {
    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, stage: newStage } : t))
    );
    try {
      await api.patch(`/tasks/${taskId}/stage`, { stage: newStage });
      loadData();
    } catch (err) {
      toast.error(formatApiError(err, "Durum güncellenemedi"));
      loadData();
    }
  };

  const startEditTask = (t) => {
    setEditingTaskId(t.id);
    setForm({
      title: t.title,
      description: t.description || "",
      stage: t.stage,
      priority: t.priority,
      due_date: t.due_date,
      customer_name: t.customer_name || "",
    });
    setOpen(true);
  };

  // Column CRUD
  const handleColumnSubmit = async () => {
    if (!colForm.title.trim()) return toast.error("Sütun başlığı zorunludur");

    try {
      if (editingColId) {
        await api.patch(`/kanban/columns/${editingColId}`, {
          title: colForm.title.trim(),
          color: colForm.color,
        });
        toast.success("Sütun güncellendi");
      } else {
        await api.post("/kanban/columns", {
          title: colForm.title.trim(),
          color: colForm.color,
        });
        toast.success("Yeni sütun eklendi");
      }
      setColDialogOpen(false);
      setColForm({ title: "", color: "purple" });
      setEditingColId(null);
      loadData();
    } catch (err) {
      toast.error(formatApiError(err, "Sütun kaydedilemedi"));
    }
  };

  const startEditColumn = (col) => {
    setEditingColId(col.id || col.key);
    setColForm({ title: col.title, color: col.color || "purple" });
    setColDialogOpen(true);
  };

  const confirmDeleteColumn = async () => {
    if (!deleteColTarget) return;
    const colIdentifier = deleteColTarget.id || deleteColTarget.key;
    const fallbackStage = columns.find((c) => (c.id || c.key) !== colIdentifier)?.key || "pending";

    setDeletingCol(true);
    // Optimistic instantaneous state update
    setColumns((prev) => prev.filter((c) => (c.id || c.key) !== colIdentifier));
    setTasks((prev) =>
      prev.map((t) => (t.stage === deleteColTarget.key ? { ...t, stage: fallbackStage } : t))
    );

    try {
      await api.delete(`/kanban/columns/${colIdentifier}`);
      toast.success("Sütun silindi ve görevler aktarıldı");
      setDeleteColTarget(null);
      loadData();
    } catch (err) {
      toast.error(formatApiError(err, "Sütun silinemedi"));
      loadData();
    } finally {
      setDeletingCol(false);
    }
  };

  // Drag & Drop Handlers
  const onDragStart = (e, id) => {
    e.dataTransfer.setData("text/plain", id);
    setDraggedTaskId(id);
  };

  const onDragOver = (e, stageKey) => {
    e.preventDefault();
    if (dragOverStage !== stageKey) {
      setDragOverStage(stageKey);
    }
  };

  const onDragLeave = (stageKey) => {
    if (dragOverStage === stageKey) {
      setDragOverStage(null);
    }
  };

  const onDrop = (e, stageKey) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("text/plain") || draggedTaskId;
    setDragOverStage(null);
    setDraggedTaskId(null);
    if (taskId) {
      handleStageChange(taskId, stageKey);
    }
  };

  return (
    <div className="space-y-4" data-testid="workflow-page">
      {/* Header action strip */}
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div className="flex items-center gap-2">
          <ListTodo className="h-4 w-4 text-brand" />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-foreground">
            Kanban İş Akışı
          </h2>
          <span className="text-[11px] text-muted-foreground font-mono">
            ({tasks.length} Görev · {columns.length} Aşama)
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Add Column Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setEditingColId(null);
              setColForm({ title: "", color: "purple" });
              setColDialogOpen(true);
            }}
            data-testid="add-column-btn"
            className="border-border hover:border-brand hover:text-brand rounded-xl text-xs h-8"
          >
            <Columns className="h-3.5 w-3.5 mr-1.5" /> Sütun Ekle
          </Button>

          {/* Add Task Dialog */}
          <Dialog
            open={open}
            onOpenChange={(o) => {
              setOpen(o);
              if (!o) {
                setForm(emptyTaskForm);
                setEditingTaskId(null);
              }
            }}
          >
            <DialogTrigger asChild>
              <Button
                size="sm"
                data-testid="add-task-btn"
                className="bg-brand text-white hover:bg-brand/90 rounded-xl text-xs h-8 shadow-xs"
              >
                <Plus className="h-3.5 w-3.5 mr-1.5" /> Yeni Görev
              </Button>
            </DialogTrigger>

            <DialogContent className="bg-card border-border max-w-lg rounded-2xl">
              <DialogHeader>
                <DialogTitle className="font-display">
                  {editingTaskId ? "Görevi Düzenle" : "Yeni İş / Görev Ekle"}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-3 py-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Görev / İş Başlığı</Label>
                  <Input
                    data-testid="task-title-input"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="Örn. Web Sitesi Arayüz Tasarımı"
                    className="rounded-xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">İlgili Müşteri (Opsiyonel)</Label>
                  <Input
                    data-testid="task-customer-input"
                    value={form.customer_name}
                    onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
                    placeholder="Örn. ABC Teknoloji A.Ş."
                    className="rounded-xl"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Aşama / Sütun</Label>
                    <Select
                      value={form.stage || (columns[0]?.key || "pending")}
                      onValueChange={(v) => setForm({ ...form, stage: v })}
                    >
                      <SelectTrigger data-testid="task-stage-select" className="rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border rounded-xl">
                        {columns.map((c) => (
                          <SelectItem key={c.key} value={c.key}>
                            {c.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Öncelik</Label>
                    <Select
                      value={form.priority}
                      onValueChange={(v) => setForm({ ...form, priority: v })}
                    >
                      <SelectTrigger data-testid="task-priority-select" className="rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border rounded-xl">
                        <SelectItem value="low">Düşük</SelectItem>
                        <SelectItem value="medium">Orta</SelectItem>
                        <SelectItem value="high">Yüksek</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Teslim / Bitiş Tarihi</Label>
                  <Input
                    data-testid="task-due-date-input"
                    type="date"
                    value={form.due_date}
                    onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                    className="rounded-xl"
                  />
                  <div className="text-[10px] text-muted-foreground">
                    Belirlenen tarih otomatik olarak Takvim modülüne yansıtılır.
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Açıklama / Notlar</Label>
                  <Textarea
                    data-testid="task-description-input"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Görev kapsamı, revizyon detayları…"
                    rows={3}
                    className="rounded-xl"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setOpen(false);
                    setEditingTaskId(null);
                  }}
                  className="rounded-xl text-xs"
                >
                  İptal
                </Button>
                <Button
                  data-testid="submit-task-btn"
                  onClick={handleTaskSubmit}
                  className="bg-brand text-white hover:bg-brand/90 rounded-xl text-xs"
                >
                  {editingTaskId ? "Güncelle" : "Görevi Oluştur"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Mobile Column Switcher Tab Bar */}
      <div className="flex md:hidden items-center gap-1 overflow-x-auto no-scrollbar py-1 bg-card/60 p-1 border border-border rounded-xl">
        {columns.map((col) => {
          const count = tasks.filter((t) => t.stage === col.key).length;
          const isActive = (activeMobileCol || columns[0]?.key) === col.key;
          return (
            <button
              key={col.key}
              onClick={() => setActiveMobileCol(col.key)}
              data-testid={`mobile-col-tab-${col.key}`}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-all ${
                isActive
                  ? "bg-secondary text-brand border border-border shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>{col.title}</span>
              <span className="text-[10px] font-mono px-1 rounded bg-[#16181d] text-muted-foreground">
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Column Create / Edit Modal */}
      <Dialog open={colDialogOpen} onOpenChange={setColDialogOpen}>
        <DialogContent className="bg-card border-border max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display">
              {editingColId ? "Sütunu Düzenle" : "Yeni Kanban Sütunu"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Sütun Başlığı</Label>
              <Input
                data-testid="col-title-input"
                value={colForm.title}
                onChange={(e) => setColForm({ ...colForm, title: e.target.value })}
                placeholder="Örn. Test / QA"
                className="rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Vurgu Rengi</Label>
              <Select
                value={colForm.color}
                onValueChange={(v) => setColForm({ ...colForm, color: v })}
              >
                <SelectTrigger data-testid="col-color-select" className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border rounded-xl">
                  <SelectItem value="zinc">Antrasit / Gri</SelectItem>
                  <SelectItem value="amber">Kehribar / Sarı</SelectItem>
                  <SelectItem value="blue">Mavi</SelectItem>
                  <SelectItem value="emerald">Yeşil</SelectItem>
                  <SelectItem value="purple">Mor</SelectItem>
                  <SelectItem value="rose">Kırmızı / Pembe</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setColDialogOpen(false)} className="rounded-xl text-xs">
              İptal
            </Button>
            <Button
              data-testid="submit-col-btn"
              onClick={handleColumnSubmit}
              className="bg-brand text-white hover:bg-brand/90 rounded-xl text-xs"
            >
              Kaydet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Column Delete Confirmation Modal */}
      <Dialog open={!!deleteColTarget} onOpenChange={(o) => !o && setDeleteColTarget(null)}>
        <DialogContent className="bg-card border-border max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2 text-expense text-base">
              <AlertTriangle className="h-5 w-5" /> Sütunu Sil
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2 text-xs text-muted-foreground">
            <p>
              <strong className="text-foreground">{deleteColTarget?.title}</strong> sütununu silmek istediğinize emin misiniz?
            </p>
            <p className="text-muted-foreground/90">
              Bu sütundaki tüm görevler otomatik olarak ilk aşamaya taşınacaktır.
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteColTarget(null)} className="rounded-xl text-xs">
              İptal
            </Button>
            <Button
              onClick={confirmDeleteColumn}
              disabled={deletingCol}
              data-testid="confirm-delete-col-btn"
              className="bg-expense text-white hover:bg-expense/90 rounded-xl text-xs"
            >
              {deletingCol ? "Siliniyor…" : "Sütunu Sil"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Interactive Drag & Drop Kanban Lanes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 items-start h-[calc(100vh-145px)] min-h-[450px]">
        {columns.map((col) => {
          const colTasks = tasks.filter((t) => t.stage === col.key);
          const colorStyles = COLUMN_COLORS[col.color] || COLUMN_COLORS.zinc;
          const isOver = dragOverStage === col.key;
          const isHiddenOnMobile = activeMobileCol && activeMobileCol !== col.key;

          return (
            <div
              key={col.key || col.id}
              onDragOver={(e) => onDragOver(e, col.key)}
              onDragLeave={() => onDragLeave(col.key)}
              onDrop={(e) => onDrop(e, col.key)}
              data-testid={`kanban-col-${col.key}`}
              className={`rounded-2xl border transition-all duration-200 p-3 flex flex-col h-full max-h-[calc(100vh-145px)] ${
                colorStyles.bg
              } ${
                isOver
                  ? "border-brand ring-2 ring-brand/20 bg-brand/5 shadow-md"
                  : colorStyles.border
              } ${isHiddenOnMobile ? "hidden md:flex" : "flex"}`}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${colorStyles.dot}`} />
                  <span className="font-semibold text-xs tracking-wide uppercase text-foreground">
                    {col.title}
                  </span>
                  <span className="text-[10px] font-mono text-muted-foreground px-1.5 py-0.5 rounded-md bg-secondary/80">
                    {colTasks.length}
                  </span>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      data-testid={`col-menu-${col.key}`}
                      className="text-muted-foreground hover:text-foreground p-1 rounded-md"
                    >
                      <MoreVertical className="h-3.5 w-3.5" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-card border-border rounded-xl">
                    <DropdownMenuItem onClick={() => startEditColumn(col)} className="rounded-lg text-xs">
                      <Pencil className="h-3.5 w-3.5 mr-1.5" /> Düzenle
                    </DropdownMenuItem>
                    {!col.is_default && (
                      <DropdownMenuItem
                        data-testid={`delete-col-${col.key}`}
                        onClick={() => setDeleteColTarget(col)}
                        className="text-expense focus:text-expense rounded-lg text-xs cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Sütunu Sil
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Tasks List */}
              <div className="space-y-2.5 flex-1 overflow-y-auto pr-0.5">
                {colTasks.length === 0 && (
                  <div
                    className={`h-28 border border-dashed rounded-xl flex flex-col items-center justify-center text-xs text-muted-foreground/60 transition-colors ${
                      isOver ? "border-brand bg-brand/10 text-brand" : "border-border/50"
                    }`}
                  >
                    {isOver ? "Görevi Buraya Bırakın" : "Bu aşamada görev yok"}
                  </div>
                )}

                {colTasks.map((t) => {
                  const d = daysUntil(t.due_date);
                  const isOverdue = t.is_overdue || (d < 0 && t.stage !== "completed");

                  return (
                    <div
                      key={t.id}
                      draggable
                      onDragStart={(e) => onDragStart(e, t.id)}
                      data-testid={`kanban-card-${t.id}`}
                      className={`group p-3 rounded-xl border bg-[#16181d] hover:border-zinc-700 transition-all cursor-grab active:cursor-grabbing shadow-xs hover:shadow-sm ${
                        isOverdue
                          ? "border-expense/50 ring-1 ring-expense/20"
                          : "border-border/80"
                      }`}
                    >
                      {/* Top row: Priority & Actions */}
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <Badge
                            variant="outline"
                            className={`text-[9px] px-1.5 py-0 rounded-md ${
                              PRIORITIES[t.priority]?.cls || ""
                            }`}
                          >
                            {PRIORITIES[t.priority]?.label || t.priority}
                          </Badge>

                          {isOverdue && (
                            <span className="flex items-center gap-1 text-[10px] text-expense font-semibold">
                              <AlertCircle className="h-3 w-3" /> Gecikti
                            </span>
                          )}
                        </div>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              data-testid={`task-menu-${t.id}`}
                              className="text-muted-foreground hover:text-foreground opacity-70 group-hover:opacity-100 transition-opacity p-0.5"
                              onClick={(ev) => ev.stopPropagation()}
                            >
                              <MoreVertical className="h-3.5 w-3.5" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-card border-border rounded-xl">
                            <DropdownMenuItem onClick={() => startEditTask(t)} className="rounded-lg text-xs">
                              <Pencil className="h-3.5 w-3.5 mr-1.5 text-brand" /> Düzenle
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              data-testid={`task-delete-${t.id}`}
                              onClick={(ev) => handleDeleteTask(t.id, ev)}
                              className="text-expense focus:text-expense cursor-pointer rounded-lg text-xs"
                            >
                              <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Sil
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {/* Card Title */}
                      <h4 className="text-xs sm:text-sm font-semibold text-foreground line-clamp-2 leading-snug">
                        {t.title}
                      </h4>

                      {/* Customer Name */}
                      {t.customer_name && (
                        <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-1">
                          <User className="h-3 w-3 text-brand shrink-0" />
                          <span className="truncate">{t.customer_name}</span>
                        </div>
                      )}

                      {/* Description */}
                      {t.description && (
                        <p className="text-[11px] text-muted-foreground line-clamp-2 mt-1 leading-relaxed">
                          {t.description}
                        </p>
                      )}

                      {/* Bottom row: Due Date & Stage Move */}
                      <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-border/40 text-[10px]">
                        <div
                          className={`flex items-center gap-1 font-mono ${
                            isOverdue
                              ? "text-expense font-semibold"
                              : "text-muted-foreground"
                          }`}
                        >
                          <Calendar className="h-3 w-3" />
                          <span>{formatDate(t.due_date)}</span>
                        </div>

                        {/* Fast stage switch select */}
                        <select
                          value={t.stage}
                          onChange={(e) => handleStageChange(t.id, e.target.value)}
                          className="bg-secondary/70 text-foreground text-[10px] rounded-lg px-1.5 py-0.5 border border-border focus:outline-none focus:border-brand"
                        >
                          {columns.map((c) => (
                            <option key={c.key} value={c.key}>
                              {c.title}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
