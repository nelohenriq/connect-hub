"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, XCircle, Eye } from "lucide-react";

interface MessageReport {
  id: string;
  message: {
    id: string;
    content: string;
    sender: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
    };
  };
  reporter: {
    id: string;
    firstName: string;
    lastName: string;
  };
  reason: string;
  description?: string;
  status: string;
  createdAt: string;
}

interface MessageModerationProps {
  reports: MessageReport[];
  onModerateReport: (reportId: string, action: "resolve" | "dismiss") => void;
}

export default function MessageModeration({
  reports,
  onModerateReport,
}: MessageModerationProps) {
  const [selectedReport, setSelectedReport] = useState<MessageReport | null>(
    null
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "resolved":
        return "bg-green-100 text-green-800";
      case "dismissed":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getReasonIcon = (reason: string) => {
    switch (reason) {
      case "harassment":
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case "spam":
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case "inappropriate":
        return <AlertTriangle className="h-4 w-4 text-purple-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Message Moderation</h2>
        <Badge variant="secondary">
          {reports.filter((r) => r.status === "pending").length} pending
        </Badge>
      </div>

      <div className="grid gap-4">
        {reports.map((report) => (
          <Card key={report.id} className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  {getReasonIcon(report.reason)}
                  <span className="font-medium capitalize">
                    {report.reason}
                  </span>
                  <Badge className={getStatusColor(report.status)}>
                    {report.status}
                  </Badge>
                </div>

                <div className="mb-3">
                  <p className="text-sm text-gray-600 mb-1">
                    Reported message:
                  </p>
                  <div className="bg-gray-50 p-3 rounded border-l-4 border-gray-300">
                    <p className="text-sm">
                      &ldquo;{report.message.content}&rdquo;
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      From: {report.message.sender.firstName}{" "}
                      {report.message.sender.lastName}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm text-gray-600">
                  <div>
                    <span>
                      Reported by: {report.reporter.firstName}{" "}
                      {report.reporter.lastName}
                    </span>
                    {report.description && (
                      <p className="mt-1 text-xs">
                        &ldquo;{report.description}&rdquo;
                      </p>
                    )}
                  </div>
                  <span>{new Date(report.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="flex flex-col space-y-2 ml-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedReport(report)}
                  className="flex items-center"
                >
                  <Eye className="h-4 w-4 mr-1" />
                  View
                </Button>

                {report.status === "pending" && (
                  <>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => onModerateReport(report.id, "resolve")}
                      className="flex items-center bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Resolve
                    </Button>

                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => onModerateReport(report.id, "dismiss")}
                      className="flex items-center"
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Dismiss
                    </Button>
                  </>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {reports.length === 0 && (
        <Card className="p-8 text-center">
          <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
          <h3 className="text-lg font-medium mb-2">All Clear!</h3>
          <p className="text-gray-600">
            No message reports to moderate at this time.
          </p>
        </Card>
      )}

      {/* Report Detail Modal would go here */}
      {selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="max-w-2xl w-full mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Report Details</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedReport(null)}
              >
                ×
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Reason</label>
                <div className="flex items-center space-x-2 mt-1">
                  {getReasonIcon(selectedReport.reason)}
                  <span className="capitalize">{selectedReport.reason}</span>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Reported Message</label>
                <div className="bg-gray-50 p-3 rounded mt-1 border">
                  <p>&ldquo;{selectedReport.message.content}&rdquo;</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Sender</label>
                  <p className="mt-1">
                    {selectedReport.message.sender.firstName}{" "}
                    {selectedReport.message.sender.lastName}
                  </p>
                  <p className="text-sm text-gray-600">
                    {selectedReport.message.sender.email}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium">Reporter</label>
                  <p className="mt-1">
                    {selectedReport.reporter.firstName}{" "}
                    {selectedReport.reporter.lastName}
                  </p>
                </div>
              </div>

              {selectedReport.description && (
                <div>
                  <label className="text-sm font-medium">
                    Additional Details
                  </label>
                  <p className="mt-1 text-sm bg-gray-50 p-2 rounded">
                    {selectedReport.description}
                  </p>
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setSelectedReport(null)}
                >
                  Close
                </Button>

                {selectedReport.status === "pending" && (
                  <>
                    <Button
                      variant="destructive"
                      onClick={() => {
                        onModerateReport(selectedReport.id, "dismiss");
                        setSelectedReport(null);
                      }}
                    >
                      Dismiss Report
                    </Button>

                    <Button
                      onClick={() => {
                        onModerateReport(selectedReport.id, "resolve");
                        setSelectedReport(null);
                      }}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Block Message
                    </Button>
                  </>
                )}
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
