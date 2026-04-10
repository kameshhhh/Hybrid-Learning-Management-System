import { useState, useEffect } from "react";
import { studentService } from "@/services/student";
import {
  GlassCard,
  Badge,
  Button
} from "@/components/ui";
import { Award, Download, ExternalLink, ShieldCheck } from "lucide-react";
import toast from "react-hot-toast";

const CertificatesPage = () => {
  const [certificates, setCertificates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCertificates();
  }, []);

  const fetchCertificates = async () => {
    try {
      setLoading(true);
      const res = await studentService.getCertificates();
      if (res.success) {
        setCertificates(res.data);
      }
    } catch (e) {
      toast.error("Failed to load certificates");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (certId: string) => {
    const url = `${import.meta.env.VITE_API_URL || ""}/api/v1/student/certificates/${certId}/download`;
    window.open(url, "_blank");
  };

  if (loading) return <p className="mt-8 text-center text-slate-500">Loading your achievements...</p>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-500 to-blue-500 bg-clip-text text-transparent">
          My Certificates
        </h1>
        <p className="text-slate-500 mt-1">Verify and download your earned skill certificates.</p>
      </div>

      {certificates.length === 0 ? (
        <GlassCard variant="card" padding="lg">
          <div className="text-center py-10 text-slate-500">
            <Award size={64} className="mx-auto mb-4 opacity-10" />
            <h3 className="text-lg font-medium">No certificates yet</h3>
            <p className="text-sm">Complete skills and score at least 50% average marks to earn certificates.</p>
          </div>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {certificates.map((cert) => (
            <GlassCard key={cert.id} variant="secondary" className="group overflow-hidden border border-white/40 hover:border-purple-300 transition-all">
              <div className="aspect-[1.414/1] bg-gradient-to-br from-slate-900 to-slate-800 relative flex flex-col items-center justify-center p-6 text-center">
                 <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-40 transition-opacity">
                    <ShieldCheck size={80} className="text-white" />
                 </div>
                 <Award size={48} className="text-amber-400 mb-4" />
                 <h3 className="text-white font-bold text-lg mb-1">{cert.skill?.name}</h3>
                 <p className="text-slate-400 text-sm mb-4">Issued on {new Date(cert.issuedAt).toLocaleDateString()}</p>
                 <Badge variant="success" className="text-xs">ID: {cert.certificateNumber}</Badge>
              </div>
              <div className="p-4 bg-white/60 flex gap-2">
                 <Button className="flex-1" variant="primary" size="sm" onClick={() => handleDownload(cert.id)} leftIcon={<Download size={14} />}>
                    Download PDF
                 </Button>
                 <Button className="flex-1" variant="outline" size="sm" onClick={() => window.open(`/verify/${cert.certificateNumber}`, "_blank")} leftIcon={<ExternalLink size={14} />}>
                    Verify
                 </Button>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {/* VERIFICATION INFO INFO */}
      <GlassCard variant="card" className="bg-blue-50/30 border-blue-100/50">
         <div className="flex items-start gap-4 p-4 text-sm text-blue-800">
            <ShieldCheck size={24} className="text-blue-500 shrink-0" />
            <div>
               <h4 className="font-bold">About Digital Verification</h4>
               <p className="mt-1">All certificates issued by HLMS contain a unique certificate number and QR code for public verification. You can share your verification link on LinkedIn or Resume.</p>
            </div>
         </div>
      </GlassCard>
    </div>
  );
};

export default CertificatesPage;
