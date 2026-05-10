import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { startExactConnectorOAuth } from "@/lib/actions/connectors/exact";

const REGIONS: { value: string; label: string }[] = [
  { value: "nl", label: "Netherlands" },
  { value: "be", label: "Belgium" },
  { value: "de", label: "Germany" },
  { value: "uk", label: "United Kingdom" },
  { value: "es", label: "Spain" },
  { value: "fr", label: "France" },
  { value: "com", label: "International (.com)" },
];

export function ExactConnectorOAuthForm({ submitLabel }: { submitLabel?: string }) {
  return (
    <form action={startExactConnectorOAuth} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="exact-connector-name">Name</Label>
        <Input
          id="exact-connector-name"
          name="name"
          required
          placeholder="Primary administration"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="exact-region">Region</Label>
        <select
          id="exact-region"
          name="region"
          required
          className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 text-sm shadow-xs focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          defaultValue="nl"
        >
          {REGIONS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="exact-env">Environment</Label>
        <select
          id="exact-env"
          name="env"
          required
          className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 text-sm shadow-xs focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          defaultValue="production"
        >
          <option value="production">Production</option>
          <option value="sandbox">Sandbox (NL only)</option>
        </select>
      </div>

      <Button type="submit" className="w-full sm:w-auto">
        {submitLabel ?? "Continue to Exact"}
      </Button>
    </form>
  );
}
