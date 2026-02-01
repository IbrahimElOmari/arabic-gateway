import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { exportToCSV, generatePDFTable, openPDFPreview } from "@/lib/export-utils";

interface ExportButtonsProps {
  data: Record<string, any>[];
  filename: string;
  headers: Record<string, string>;
  title?: string;
}

export function ExportButtons({ data, filename, headers, title }: ExportButtonsProps) {
  const { t } = useTranslation();

  const handleExportCSV = () => {
    exportToCSV(data, filename, headers);
  };

  const handleExportPDF = () => {
    const html = generatePDFTable(data, title || filename, headers);
    openPDFPreview(html, filename);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          {t("common.export", "Export")}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={handleExportCSV}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          {t("common.exportCSV", "Export as CSV")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportPDF}>
          <FileText className="h-4 w-4 mr-2" />
          {t("common.exportPDF", "Export as PDF")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
