// src/renderer/Dashboard.tsx
import React, { useEffect, useState } from 'react';
import { PrintJob } from '../types/index';
import type { SystemPrinter } from '../types/printer';
import Header from './components/Header';
import ErrorBanner from './components/ErrorBanner';
import SettingsModal from './components/SettingsModal';
import PrintPreview from './components/PrintPreview';
import JobsList from './components/JobsList';
import PrinterManagement from './components/PrinterManagement';
import History from './components/History';

export default function Dashboard() {
  const [jobs, setJobs] = useState<PrintJob[]>([]);
  const [printingJobId, setPrintingJobId] = useState<string | null>(null);
  const [loadingJobId, setLoadingJobId] = useState<string | null>(null); // ✅ Add loading state for preview
  const [error, setError] = useState<string | null>(null);
  const [wsStatus, setWsStatus] = useState('connecting');
  const [shopInfo, setShopInfo] = useState({ shopName: '', ownerName: '', shopId: '' });
  
  // Printer Management State
  const [showPrinterModal, setShowPrinterModal] = useState(false);
  const [availablePrinters, setAvailablePrinters] = useState<SystemPrinter[]>([]);
  const [selectedPrinters, setSelectedPrinters] = useState<Set<string>>(new Set());
  const [sendingPrinters, setSendingPrinters] = useState(false);
  const [loadingPrinters, setLoadingPrinters] = useState(false);
  
  // ✅ Updated preview state
  const [previewJob, setPreviewJob] = useState<PrintJob | null>(null);
  const [downloadedPdfPath, setDownloadedPdfPath] = useState<string>('');
    const [showHistory, setShowHistory] = useState(false);

  // Settings Modal State
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Printer Editing State
  const [editingPrinter, setEditingPrinter] = useState<string | null>(null);
  const [editedCapabilities, setEditedCapabilities] = useState<{
    [printerId: string]: {
      supportsColor: boolean;
      supportsDuplex: boolean;
      paperSizes: string[];
    }
  }>({});
 
  useEffect(() => {
    loadShopInfo();
    loadAvailablePrinters();

    window.electron.on('new-job', (job: PrintJob) => {
      console.log('📥 Received new job:', job.jobNumber);
      setJobs(prev => [job, ...prev]);
    });

    window.electron.on('ws-status', (status: string) => {
      setWsStatus(status);
    });

    loadExistingJobs(true);
  }, []);

  async function loadShopInfo() {
    try {
      const info = await window.electron.getShopInfo();
      const registration = await window.electron.checkRegistration();
      setShopInfo({ ...info, shopId: registration.shopId || '' });
    } catch (err) {
      console.error('Failed to load shop info:', err);
    }
  }

  async function loadAvailablePrinters(forceRefresh: boolean = false) {
    try {
      setLoadingPrinters(true);
      const printers = await window.electron.getAllPrinters(forceRefresh);
      setAvailablePrinters(printers);
      
      const capsMap: any = {};
      printers.forEach(p => {
        capsMap[p.printerId] = {
          supportsColor: p.capabilities.supportsColor,
          supportsDuplex: p.capabilities.supportsDuplex,
          paperSizes: [...p.capabilities.paperSizes]
        };
      });
      setEditedCapabilities(capsMap);
      
      console.log('🖨️ Found printers:', printers.length);
    } catch (err) {
      console.error('Failed to load printers:', err);
      setError('Failed to load printers. Please try again.');
    } finally {
      setLoadingPrinters(false);
    }
  }

  function togglePrinterSelection(printerId: string) {
    const newSelection = new Set(selectedPrinters);
    if (newSelection.has(printerId)) {
      newSelection.delete(printerId);
    } else {
      newSelection.add(printerId);
    }
    setSelectedPrinters(newSelection);
  }

  function startEditPrinter(printerId: string, e: React.MouseEvent) {
    e.stopPropagation();
    setEditingPrinter(printerId);
  }

  function cancelEditPrinter(e: React.MouseEvent) {
    e.stopPropagation();
    setEditingPrinter(null);
    loadAvailablePrinters();
  }

  async function saveEditPrinter(printerId: string, e: React.MouseEvent) {
    e.stopPropagation();
    
    try {
      await window.electron.savePrinterEdits(
        printerId,
        editedCapabilities[printerId]
      );
      
      const updatedPrinters = availablePrinters.map(p => {
        if (p.printerId === printerId) {
          return {
            ...p,
            capabilities: {
              ...p.capabilities,
              ...editedCapabilities[printerId]
            }
          };
        }
        return p;
      });
      
      setAvailablePrinters(updatedPrinters);
      setEditingPrinter(null);
      console.log('✅ Updated and saved capabilities for:', printerId);
    } catch (error) {
      console.error('❌ Failed to save printer edits:', error);
      setError('Failed to save printer configuration');
    }
  }

  function toggleColor(printerId: string) {
    setEditedCapabilities(prev => ({
      ...prev,
      [printerId]: {
        ...prev[printerId],
        supportsColor: !prev[printerId].supportsColor
      }
    }));
  }

  function toggleDuplex(printerId: string) {
    setEditedCapabilities(prev => ({
      ...prev,
      [printerId]: {
        ...prev[printerId],
        supportsDuplex: !prev[printerId].supportsDuplex
      }
    }));
  }

  function togglePaperSize(printerId: string, size: string) {
    setEditedCapabilities(prev => {
      const currentSizes = prev[printerId].paperSizes;
      const newSizes = currentSizes.includes(size)
        ? currentSizes.filter(s => s !== size)
        : [...currentSizes, size];
      
      return {
        ...prev,
        [printerId]: {
          ...prev[printerId],
          paperSizes: newSizes
        }
      };
    });
  }

  async function clearPrinterCache() {
    const confirmed = await window.electron.showConfirmationDialog({
      title: 'Clear Printer Cache',
      message: 'This will force re-detection of all printers. Continue?',
      buttons: ['Yes, Clear Cache', 'Cancel']
    });

    if (confirmed) {
      setShowPrinterModal(false);
      await window.electron.clearPrinterCache();
      await loadAvailablePrinters(true);
      setShowPrinterModal(true);
      console.log('✅ Printer cache cleared');
    }
  }

  async function sendPrintersToBackend() {
    if (selectedPrinters.size === 0) {
      setError('Please select at least one printer');
      return;
    }

    setSendingPrinters(true);
    setError(null);

    try {
      const selectedPrinterData = availablePrinters.filter(p => 
        selectedPrinters.has(p.printerId)
      );
      
      console.log('📤 Sending printer data:', selectedPrinterData);

      const result = await window.electron.sendPrintersToBackend(selectedPrinterData);
      
      console.log('📥 Backend response:', result);

      if (result.success) {
        await window.electron.showConfirmationDialog({
          title: 'Success',
          message: `Successfully sent ${result.count} printer(s) to backend!`,
          buttons: ['OK']
        });
        
        setShowPrinterModal(false);
        setSelectedPrinters(new Set());
        loadAvailablePrinters();
      } else {
        setError(result.error || 'Failed to send printers');
      }
    } catch (err: any) {
      console.error('❌ Send printers error:', err);
      setError(err.message || 'Failed to send printers');
    } finally {
      setSendingPrinters(false);
    }
  }

 async function loadExistingJobs(syncWithBackend: boolean = false) {
    try {
      if (syncWithBackend) {
        console.log('🔄 Syncing jobs from backend...');
        const result = await window.electron.syncJobsFromBackend();
        
        if (result.success) {
          console.log(`✅ Synced ${result.jobs.length} jobs from backend`);
          setJobs(result.jobs);
        } else {
          console.warn('⚠️ Backend sync failed, using local jobs');
          const localJobs = await window.electron.getPendingJobs();
          setJobs(localJobs);
        }
      } else {
        const existingJobs = await window.electron.getPendingJobs();
        setJobs(existingJobs);
      }
    } catch (err) {
      console.error('Failed to load jobs:', err);
      // Fallback to local jobs
      const localJobs = await window.electron.getPendingJobs();
      setJobs(localJobs);
    }
  }

  async function handleLogout() {
    const confirmed = await window.electron.showConfirmationDialog({
      title: 'Confirm Logout',
      message: 'Are you sure you want to logout? You will need to register again.',
      buttons: ['Yes, Logout', 'Cancel']
    });

    if (confirmed) {
      await window.electron.logout();
      window.location.reload();
    }
  }

  // ✅ OPTIMIZED: Download ONCE when opening preview
  async function confirmAndPrint(job: PrintJob) {
    try {
      setLoadingJobId(job._id);
      setError(null);
      
      console.log('📥 Downloading file for preview...');
      const pdfPath = await window.electron.downloadJobFile(job);
      console.log('✅ File downloaded:', pdfPath);
      
      // Pass downloaded path to preview
      setDownloadedPdfPath(pdfPath);
      setPreviewJob(job);
    } catch (error) {
      console.error('❌ Failed to download file:', error);
      setError(error instanceof Error ? error.message : 'Failed to download file for preview');
    } finally {
      setLoadingJobId(null);
    }
  }

  // ✅ OPTIMIZED: Print with already-downloaded file
async function handlePrintFromPreview(updatedSettings: any) {
  if (!previewJob) return;
  console.log('🖨️ Printing from preview with settings:', updatedSettings);
  
  try {
    setPrintingJobId(previewJob._id);
    setError(null);
    
    // ✅ BEST PRACTICE: Build job object with explicit priority
    const jobToPrint = {
      _id: previewJob._id,
      jobNumber: previewJob.jobNumber,
      fileName: previewJob.fileName,
      fileKey: previewJob.fileKey,
      shopId: previewJob.shopId,
      status: previewJob.status,
      estimatedCost: previewJob.estimatedCost,
      timestamps: previewJob.timestamps,
      
      // ✅ Updated values take priority
      printerName: updatedSettings.printerName || previewJob.printerName,
      settings: {
        ...previewJob.settings,
        ...updatedSettings
      },
      localPdfPath: updatedSettings.convertedPdfPath || downloadedPdfPath
    };

    console.log('🖨️ Printing to:', jobToPrint.printerName); // ✅ Will show HP LaserJet
    console.log('📋 Settings:', jobToPrint.settings);
    console.log('📁 Local path:', jobToPrint.localPdfPath);

    const result = await window.electron.printJob(jobToPrint);
    
    if (result.success) {
      console.log('✅ Print successful on', jobToPrint.printerName);
      setJobs(prev => prev.filter(j => j._id !== previewJob._id));
      setPreviewJob(null);
      setDownloadedPdfPath('');
    } else {
      throw new Error(result.error || 'Print failed');
    }
  } catch (err) {
    console.error('❌ Print error:', err);
    setError(err instanceof Error ? err.message : 'Print failed');
  } finally {
    setPrintingJobId(null);
  }
}


  function handleCancelPreview() {
    setPreviewJob(null);
    setDownloadedPdfPath('');
  }

  const availablePaperSizes = ['A4', 'Letter', 'Legal', 'A3', 'A5', 'Executive', 'Tabloid'];
 if (showHistory) {
    return <History onBack={() => setShowHistory(false)} />;
  }
 return (
    <div className="h-screen flex flex-col bg-slate-100 font-sans">
      <Header
        shopName={shopInfo.shopName}
        ownerName={shopInfo.ownerName}
        wsStatus={wsStatus}
        printerCount={availablePrinters.length}
        onSettingsClick={() => setShowSettingsModal(true)}
        onPrintersClick={() => setShowPrinterModal(true)}
        onRefreshClick={() => loadExistingJobs(true)}
               onShowHistory={() => setShowHistory(true)} 
 onLogoutClick={handleLogout}
      />

      <ErrorBanner message={error} onDismiss={() => setError(null)} />

      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        shopId={shopInfo.shopId}
      />
 
      {previewJob && downloadedPdfPath && (
        <PrintPreview
          pdfPath={downloadedPdfPath}
          job={previewJob}
          onPrint={handlePrintFromPreview}
          onCancel={handleCancelPreview}
        />
      )}

      <PrinterManagement
        isOpen={showPrinterModal}
        onClose={() => setShowPrinterModal(false)}
        printers={availablePrinters}
        selectedPrinters={selectedPrinters}
        editingPrinter={editingPrinter}
        editedCapabilities={editedCapabilities}
        loadingPrinters={loadingPrinters}
        sendingPrinters={sendingPrinters}
        onToggleSelection={togglePrinterSelection}
        onStartEdit={startEditPrinter}
        onSaveEdit={saveEditPrinter}
        onCancelEdit={cancelEditPrinter}
        onToggleColor={toggleColor}
        onToggleDuplex={toggleDuplex}
        onTogglePaperSize={togglePaperSize}
        onClearCache={clearPrinterCache}
        onSendToBackend={sendPrintersToBackend}
        availablePaperSizes={availablePaperSizes}
      />

      <JobsList
        jobs={jobs}
        onPrintJob={confirmAndPrint}
        loadingJobId={loadingJobId}
        printingJobId={printingJobId}
      />
    </div>
  );
}

