"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash2, AlertTriangle, CheckCircle, Loader2 } from "lucide-react";

export default function CleanupDataPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const cleanupAllData = async () => {
    if (!confirm("⚠️ WARNING: This will delete ALL data (phones, orders, customers, inquiries, conversations) for your current account. This action cannot be undone. Are you sure?")) {
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/cleanup-all", {
        method: "DELETE",
      });

      const data = await response.json();

      if (response.ok) {
        setResult(data);
      } else {
        setError(data.error || "Failed to cleanup data");
      }
    } catch (err) {
      setError("Network error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const cleanupPhonesOnly = async () => {
    if (!confirm("This will delete ALL phones/items from your inventory. Are you sure?")) {
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/phones/cleanup", {
        method: "DELETE",
      });

      const data = await response.json();

      if (response.ok) {
        setResult(data);
      } else {
        setError(data.error || "Failed to cleanup phones");
      }
    } catch (err) {
      setError("Network error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-6">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Trash2 className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Cleanup Data</h1>
          <p className="text-slate-500">Remove demo/test data from your account</p>
        </div>

        <div className="space-y-4">
          {/* Cleanup All Data */}
          <div className="border border-red-200 rounded-lg p-4 bg-red-50">
            <div className="flex items-start gap-3 mb-3">
              <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-900">Delete All Data</h3>
                <p className="text-sm text-red-700">
                  Removes all phones, orders, customers, inquiries, and conversations
                </p>
              </div>
            </div>
            <Button
              onClick={cleanupAllData}
              disabled={isLoading}
              variant="destructive"
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Cleaning up...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete All Data
                </>
              )}
            </Button>
          </div>

          {/* Cleanup Phones Only */}
          <div className="border border-orange-200 rounded-lg p-4 bg-orange-50">
            <div className="flex items-start gap-3 mb-3">
              <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-orange-900">Delete Phones Only</h3>
                <p className="text-sm text-orange-700">
                  Removes only phones/items from inventory
                </p>
              </div>
            </div>
            <Button
              onClick={cleanupPhonesOnly}
              disabled={isLoading}
              variant="outline"
              className="w-full border-orange-300 text-orange-700 hover:bg-orange-100"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Cleaning up...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Phones Only
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Results */}
        {result && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <h3 className="font-semibold text-green-900">Success!</h3>
            </div>
            <p className="text-sm text-green-700 mb-2">{result.message}</p>
            {result.details && (
              <div className="text-xs text-green-600 space-y-1">
                <div>• Phones: {result.details.phones}</div>
                <div>• Orders: {result.details.orders}</div>
                <div>• Customers: {result.details.customers}</div>
                <div>• Inquiries: {result.details.inquiries}</div>
                <div>• Conversations: {result.details.conversations}</div>
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <h3 className="font-semibold text-red-900">Error</h3>
            </div>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        )}

        {/* Back to Dashboard */}
        <div className="mt-6 pt-4 border-t border-slate-200">
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => window.location.href = "/admin"}
          >
            Back to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}