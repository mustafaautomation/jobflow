"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  assignFormAction,
  inviteFormAction,
  loginAction,
  noteFormAction,
  photoFormAction,
  remindAction,
  serviceFormAction,
  statusDirectAction,
} from "@/lib/actions";
import { STATUS_LABEL, STATUS_ORDER } from "@/lib/format";
import type { ActionResult, JobStatus, Technician, User } from "@/lib/types";

export function LoginPanel({ users, supabase }: { users: User[]; supabase: boolean }) {
  const [state, action, pending] = useActionState(loginAction, null);
  return (
    <div className="space-y-6">
      {supabase ? (
        <form action={action} className="space-y-3">
          <Field label="Email" name="email" type="email" />
          <Field label="Password" name="password" type="password" />
          <Button className="h-11 w-full" disabled={pending} type="submit">
            Sign in
          </Button>
          <ErrorText state={state} />
        </form>
      ) : (
        <>
          <form action={action} className="space-y-3">
            <Field label="Work email" name="email" type="email" />
            <Button className="h-11 w-full" disabled={pending} type="submit">
              Enter workspace
            </Button>
            <ErrorText state={state} />
          </form>
          <div className="space-y-2">
            {users.map((user) => (
              <form action={action} key={user.id}>
                <input name="email" type="hidden" value={user.email} />
                <Button className="h-11 w-full justify-between" type="submit" variant="outline">
                  <span>Continue as {user.name}</span>
                  <span className="text-xs capitalize text-muted-foreground">{user.role}</span>
                </Button>
              </form>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function AssignForm({
  jobId,
  customerName,
  technicians,
  disabled,
}: {
  jobId: string;
  customerName: string;
  technicians: Technician[];
  disabled?: boolean;
}) {
  const [state, action, pending] = useActionState(assignFormAction, null);
  return (
    <form action={action} className="flex items-center gap-2">
      <input name="jobId" type="hidden" value={jobId} />
      <select
        aria-label={`Assign ${customerName}`}
        className="h-8 min-w-0 flex-1 rounded-lg border border-input bg-card px-2 text-xs"
        defaultValue=""
        disabled={disabled}
        name="technicianId"
      >
        <option value="">Technician</option>
        {technicians.map((tech) => (
          <option key={tech.id} value={tech.id}>
            {tech.name}
          </option>
        ))}
      </select>
      <Button data-testid="assign-job" disabled={disabled || pending} size="sm" type="submit">
        Assign
      </Button>
      <ErrorText state={state} />
    </form>
  );
}

export function NoteForm({ jobId, disabled }: { jobId: string; disabled?: boolean }) {
  const [state, action, pending] = useActionState(noteFormAction, null);
  return (
    <form action={action} className="space-y-2">
      <input name="jobId" type="hidden" value={jobId} />
      <Label htmlFor={`note-${jobId}`}>Note</Label>
      <Textarea disabled={disabled} id={`note-${jobId}`} name="body" placeholder="What did you find?" />
      <Button disabled={disabled || pending} type="submit">
        Save note
      </Button>
      {state?.ok ? <p className="text-sm text-emerald-800">Note saved.</p> : <ErrorText state={state} />}
    </form>
  );
}

export function PhotoForm({ jobId, disabled }: { jobId: string; disabled?: boolean }) {
  const [state, action, pending] = useActionState(photoFormAction, null);
  return (
    <form action={action} className="space-y-2">
      <input name="jobId" type="hidden" value={jobId} />
      <Label htmlFor={`photo-${jobId}`}>Photo</Label>
      <Input accept="image/*" capture="environment" disabled={disabled} id={`photo-${jobId}`} name="photo" type="file" />
      <Button disabled={disabled || pending} type="submit">
        Upload photo
      </Button>
      {state?.ok ? <p className="text-sm text-emerald-800">Photo attached.</p> : <ErrorText state={state} />}
    </form>
  );
}

export function ServiceForm({ disabled }: { disabled?: boolean }) {
  const [state, action, pending] = useActionState(serviceFormAction, null);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      <Field label="Name" name="name" />
      <Field label="Category" name="category" />
      <Field label="Duration (minutes)" name="durationMin" type="number" />
      <Field label="Price (USD)" name="price" type="number" />
      <div className="sm:col-span-2">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" />
      </div>
      <Button className="h-11 sm:col-span-2" disabled={disabled || pending} type="submit">
        Add to catalog
      </Button>
      {state?.ok ? <p className="text-sm text-emerald-800 sm:col-span-2">{state.message}</p> : <ErrorText state={state} />}
    </form>
  );
}

export function InviteForm({ disabled }: { disabled?: boolean }) {
  const [state, action, pending] = useActionState(inviteFormAction, null);
  return (
    <form action={action} className="grid gap-3">
      <Field label="Name" name="name" />
      <Field label="Email" name="email" type="email" />
      <Field label="Phone" name="phone" />
      <Button disabled={disabled || pending} type="submit">
        Invite technician
      </Button>
      {state?.ok ? <p className="text-sm text-emerald-800">{state.message}</p> : <ErrorText state={state} />}
    </form>
  );
}

export function RemindButton({ disabled }: { disabled?: boolean }) {
  const router = useRouter();
  return (
    <Button
      disabled={disabled}
      onClick={async () => {
        const result = await remindAction();
        if (!result.ok) toast.error(result.error);
        else {
          toast.success(result.message || "Reminders queued");
          router.refresh();
        }
      }}
      type="button"
      variant="outline"
    >
      Queue tomorrow&apos;s reminders
    </Button>
  );
}

export function StatusSelect({
  jobId,
  status,
  disabled,
}: {
  jobId: string;
  status: JobStatus;
  disabled?: boolean;
}) {
  const router = useRouter();
  const choices = STATUS_ORDER.filter((item) => item !== "invoiced");
  return (
    <Select
      disabled={disabled || status === "invoiced"}
      onValueChange={async (value) => {
        if (!value || value === status) return;
        const result = await statusDirectAction(jobId, value as JobStatus);
        if (!result.ok) toast.error(result.error);
        else router.refresh();
      }}
      value={status === "invoiced" ? "complete" : status}
    >
      <SelectTrigger aria-label="Job status" className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {choices.map((item) => (
          <SelectItem key={item} value={item}>
            {STATUS_LABEL[item]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function Field({ label, name, type = "text" }: { label: string; name: string; type?: string }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input className="h-11" id={name} name={name} type={type} />
    </div>
  );
}

function ErrorText({ state }: { state: ActionResult | null }) {
  if (!state || state.ok) return null;
  return <p className="text-sm text-destructive">{state.error}</p>;
}
