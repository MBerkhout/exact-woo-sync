"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ExactConnectorOAuthForm } from "@/components/connectors/exact-connector-oauth-form";

export function AddExactConnectorDialog() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button type="button">Add connector</Button>} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Exact Online</DialogTitle>
          <DialogDescription>
            Creates a connector placeholder and redirects through Exact OAuth (admin only).
          </DialogDescription>
        </DialogHeader>
        <ExactConnectorOAuthForm />
      </DialogContent>
    </Dialog>
  );
}
