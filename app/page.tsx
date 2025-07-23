"use client";

import type React from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useFavicon } from "@/lib/favicon-utils";
import {
  AlertCircle,
  Download,
  File,
  FileText,
  Github,
  Upload,
} from "lucide-react";
import { useEffect, useState } from "react";

interface SitemapEntry {
  url: string;
  lastModified?: string;
  changeFrequency?: string;
  priority?: string;
  alternates?: string;
}

const cleanXmlContent = (content: string): string => {
  // Remove common browser messages and non-XML content
  let cleaned = content
    // Remove the common browser message about XML styling
    .replace(
      /This XML file does not appear to have any style information associated with it\./gi,
      ""
    )
    .replace(/The document tree is shown below\./gi, "")
    // Remove other common browser messages
    .replace(/This page contains the following errors:/gi, "")
    .replace(/Below is a rendering of the page up to the first error\./gi, "")
    // Remove any leading/trailing whitespace and newlines
    .trim();

  // Find the start of actual XML content
  const xmlStartPatterns = [
    /<\?xml/i, // XML declaration
    /<urlset/i, // Sitemap root element
    /<sitemapindex/i, // Sitemap index root element
    /<rss/i, // RSS feed
    /<feed/i, // Atom feed
  ];

  let xmlStart = -1;
  for (const pattern of xmlStartPatterns) {
    const match = cleaned.search(pattern);
    if (match !== -1) {
      xmlStart = match;
      break;
    }
  }

  // If we found XML content, extract from that point
  if (xmlStart !== -1) {
    cleaned = cleaned.substring(xmlStart);
  }

  // Remove any remaining non-XML text at the beginning
  // Look for lines that don't start with < and remove them
  const lines = cleaned.split("\n");
  let firstXmlLine = 0;

  for (let i = 0; i < lines.length; i++) {
    const trimmedLine = lines[i].trim();
    if (trimmedLine.startsWith("<") || trimmedLine === "") {
      firstXmlLine = i;
      break;
    }
  }

  if (firstXmlLine > 0) {
    cleaned = lines.slice(firstXmlLine).join("\n");
  }

  return cleaned.trim();
};

export default function SitemapConverter() {
  const [file, setFile] = useState<File | null>(null);
  const [sitemapData, setSitemapData] = useState<SitemapEntry[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string>("");
  const [xmlContent, setXmlContent] = useState<string>("");
  const [activeTab, setActiveTab] = useState<string>("upload");

  const { startSimpleProcessing, stopSimpleProcessing } = useFavicon();

  // Update favicon when processing state changes
  useEffect(() => {
    if (isProcessing) {
      startSimpleProcessing();
      // Also update document title to show processing
      document.title = "Processing... - Sitemap to CSV Converter";
    } else {
      stopSimpleProcessing();
      // Reset document title
      document.title = "Sitemap to CSV Converter";
    }

    // Cleanup on unmount
    return () => {
      stopSimpleProcessing();
    };
  }, [isProcessing, startSimpleProcessing, stopSimpleProcessing]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError("");
      setSitemapData([]);
    }
  };

  const parseSitemap = async () => {
    if (!file && !xmlContent.trim()) return;

    setIsProcessing(true);
    setError("");

    try {
      // Add a small delay to show the processing state
      await new Promise((resolve) => setTimeout(resolve, 500));

      let text: string;

      if (activeTab === "upload" && file) {
        const rawText = await file.text();
        text = cleanXmlContent(rawText);
      } else if (activeTab === "paste" && xmlContent.trim()) {
        text = cleanXmlContent(xmlContent.trim());
      } else {
        throw new Error("No content provided");
      }

      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(text, "text/xml");

      // Check for parsing errors
      const parserError = xmlDoc.querySelector("parsererror");
      if (parserError) {
        throw new Error("Invalid XML format");
      }

      const urls: SitemapEntry[] = [];

      // Handle regular sitemap
      const urlElements = xmlDoc.querySelectorAll("url");
      urlElements.forEach((urlElement) => {
        const loc = urlElement.querySelector("loc")?.textContent;
        if (loc) {
          const entry: SitemapEntry = {
            url: loc,
            lastModified:
              urlElement.querySelector("lastmod")?.textContent || "",
            changeFrequency:
              urlElement.querySelector("changefreq")?.textContent || "",
            priority: urlElement.querySelector("priority")?.textContent || "",
          };

          // Handle alternates (hreflang)
          const alternates = urlElement.querySelectorAll("xhtml\\:link, link");
          if (alternates.length > 0) {
            const alternateUrls = Array.from(alternates)
              .map(
                (alt) =>
                  `${alt.getAttribute("hreflang")}: ${alt.getAttribute("href")}`
              )
              .join("; ");
            entry.alternates = alternateUrls;
          }

          urls.push(entry);
        }
      });

      // Handle sitemap index
      if (urls.length === 0) {
        const sitemapElements = xmlDoc.querySelectorAll("sitemap");
        sitemapElements.forEach((sitemapElement) => {
          const loc = sitemapElement.querySelector("loc")?.textContent;
          if (loc) {
            urls.push({
              url: loc,
              lastModified:
                sitemapElement.querySelector("lastmod")?.textContent || "",
              changeFrequency: "Sitemap Index",
              priority: "",
            });
          }
        });
      }

      if (urls.length === 0) {
        throw new Error("No URLs found in the sitemap");
      }

      setSitemapData(urls);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse sitemap");
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadCSV = () => {
    if (sitemapData.length === 0) return;

    const headers = [
      "URL",
      "Last Modified",
      "Change Frequency",
      "Priority",
      "Alternates",
    ];
    const csvContent = [
      headers.join(","),
      ...sitemapData.map((entry) =>
        [
          `"${entry.url}"`,
          `"${entry.lastModified || ""}"`,
          `"${entry.changeFrequency || ""}"`,
          `"${entry.priority || ""}"`,
          `"${entry.alternates || ""}"`,
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `sitemap-${Date.now()}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setError("");
    setSitemapData([]);
    if (value === "upload") {
      setXmlContent("");
    } else {
      setFile(null);
    }
  };

  return (
    <div
      className="min-h-screen bg-gray-50"
      style={{
        backgroundImage: `
        radial-gradient(circle at 1px 1px, rgba(0,0,0,0.02) 1px, transparent 0)
      `,
        backgroundSize: "20px 20px",
      }}
    >
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <header className="text-center mb-12 relative">
          {/* GitHub Link */}
          <a
            href="https://github.com/qwertyu-alex/sitemap-to-xml"
            target="_blank"
            rel="noopener noreferrer"
            className="absolute top-0 right-0 inline-flex items-center justify-center w-10 h-10 bg-white rounded-xl shadow-sm border border-gray-100 "
            title="View source on GitHub"
          >
            <Button variant="outline">
              Open Source
              <Github
                className="w-5 h-5 text-gray-700 group-hover:text-gray-900"
                strokeWidth={1.5}
              />
            </Button>
          </a>

          <div className="inline-flex items-center justify-center w-16 h-16 mb-6 bg-white rounded-2xl shadow-sm border border-gray-100">
            <FileText className="w-8 h-8 text-gray-700" strokeWidth={1.5} />
          </div>
          <h1 className="text-3xl font-medium text-gray-900 mb-3 tracking-tight">
            Sitemap to CSV Converter
          </h1>
          <p className="text-gray-600 max-w-lg mx-auto leading-relaxed">
            Transform XML sitemaps into structured CSV data for analysis and
            reporting
          </p>
        </header>

        {/* Main Input Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-8 overflow-hidden">
          <div className="p-8">
            <div className="flex items-center mb-6">
              <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center mr-3">
                <Upload className="w-4 h-4 text-gray-600" strokeWidth={1.5} />
              </div>
              <div>
                <h2 className="text-lg font-medium text-gray-900">
                  Import Sitemap
                </h2>
                <p className="text-sm text-gray-600">
                  Upload a file or paste XML content
                </p>
              </div>
            </div>

            <Tabs
              value={activeTab}
              onValueChange={handleTabChange}
              className="w-full"
            >
              <div className="bg-gray-50 p-1 rounded-xl mb-6 inline-flex">
                <TabsList className="bg-transparent p-0 h-auto">
                  <TabsTrigger
                    value="upload"
                    className="px-6 py-3 text-sm font-medium rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-gray-900 text-gray-600 transition-all duration-150"
                  >
                    Upload File
                  </TabsTrigger>
                  <TabsTrigger
                    value="paste"
                    className="px-6 py-3 text-sm font-medium rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-gray-900 text-gray-600 transition-all duration-150"
                  >
                    Paste XML
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="upload" className="mt-0">
                <div className="space-y-4">
                  <Label
                    htmlFor="sitemap-file"
                    className="text-sm font-medium text-gray-700"
                  >
                    XML Sitemap File
                  </Label>
                  <div className="relative">
                    <input
                      id="sitemap-file"
                      type="file"
                      accept=".xml,.txt"
                      onChange={handleFileChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="h-12 border-gray-200 rounded-xl bg-gray-50 border flex items-center justify-center cursor-pointer hover:bg-gray-100 transition-colors">
                      <span className="text-sm font-medium text-gray-700">
                        Choose File
                      </span>
                    </div>
                  </div>

                  {file && (
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                            <File
                              className="w-5 h-5 text-gray-600"
                              strokeWidth={1.5}
                            />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {file.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {(file.size / 1024).toFixed(1)} KB
                            </p>
                          </div>
                        </div>
                        <Button
                          onClick={parseSitemap}
                          disabled={isProcessing}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium shadow-sm transition-all duration-150 hover:shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isProcessing ? (
                            <div className="flex items-center">
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                              Processing...
                            </div>
                          ) : (
                            "Convert"
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="paste" className="mt-0">
                <div className="space-y-4">
                  <Label
                    htmlFor="xml-content"
                    className="text-sm font-medium text-gray-700"
                  >
                    XML Content
                  </Label>
                  <div className="relative">
                    <Textarea
                      id="xml-content"
                      placeholder="Paste your sitemap XML content here..."
                      value={xmlContent}
                      onChange={(e) => setXmlContent(e.target.value)}
                      className="min-h-[200px] font-mono text-sm border-gray-200 rounded-xl bg-gray-50 resize-none focus:bg-white transition-colors"
                      style={{
                        boxShadow: "inset 0 1px 2px rgba(0,0,0,0.05)",
                      }}
                    />
                  </div>

                  {xmlContent.trim() && (
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                            <FileText
                              className="w-5 h-5 text-gray-600"
                              strokeWidth={1.5}
                            />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              XML Content
                            </p>
                            <p className="text-xs text-gray-500">
                              {(xmlContent.length / 1024).toFixed(1)} KB
                            </p>
                          </div>
                        </div>
                        <Button
                          onClick={parseSitemap}
                          disabled={isProcessing}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium shadow-sm transition-all duration-150 hover:shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isProcessing ? (
                            <div className="flex items-center">
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                              Processing...
                            </div>
                          ) : (
                            "Convert"
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>

            {error && (
              <Alert className="mt-6 border-red-200 bg-red-50 rounded-xl">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800 font-medium">
                  {error}
                </AlertDescription>
              </Alert>
            )}
          </div>
        </div>

        {/* Results Section */}
        {sitemapData.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-8 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center mr-3">
                    <FileText
                      className="w-4 h-4 text-gray-600"
                      strokeWidth={1.5}
                    />
                  </div>
                  <div>
                    <h2 className="text-lg font-medium text-gray-900">
                      Extracted Data
                    </h2>
                    <p className="text-sm text-gray-600">
                      {sitemapData.length} URLs found
                    </p>
                  </div>
                </div>
                <Button
                  onClick={downloadCSV}
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium shadow-sm transition-all duration-150 hover:shadow-md active:scale-95"
                >
                  <Download className="w-4 h-4 mr-2" strokeWidth={1.5} />
                  Download CSV
                </Button>
              </div>
            </div>

            <div className="overflow-auto max-h-96">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 border-b border-gray-100">
                    <TableHead className="font-medium text-gray-700 py-4">
                      URL
                    </TableHead>
                    <TableHead className="font-medium text-gray-700 py-4">
                      Last Modified
                    </TableHead>
                    <TableHead className="font-medium text-gray-700 py-4">
                      Change Frequency
                    </TableHead>
                    <TableHead className="font-medium text-gray-700 py-4">
                      Priority
                    </TableHead>
                    <TableHead className="font-medium text-gray-700 py-4">
                      Alternates
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sitemapData.slice(0, 100).map((entry, index) => (
                    <TableRow
                      key={index}
                      className="border-b border-gray-50 hover:bg-gray-25 transition-colors"
                    >
                      <TableCell className="font-mono text-sm text-gray-900 py-4 max-w-xs truncate">
                        {entry.url}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600 py-4">
                        {entry.lastModified || "—"}
                      </TableCell>
                      <TableCell className="py-4">
                        {entry.changeFrequency && (
                          <Badge
                            variant="outline"
                            className="bg-gray-50 text-gray-700 border-gray-200 rounded-md"
                          >
                            {entry.changeFrequency}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600 py-4">
                        {entry.priority || "—"}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600 py-4 max-w-xs truncate">
                        {entry.alternates || "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {sitemapData.length > 100 && (
                <div className="p-6 text-center text-sm text-gray-500 bg-gray-50 border-t border-gray-100">
                  Showing first 100 entries. Download CSV to access all{" "}
                  {sitemapData.length} URLs.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
