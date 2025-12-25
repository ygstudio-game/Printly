// src/main/windowsPrinterDetector.ts
import { exec } from 'child_process';
import { promisify } from 'util';
import os from 'os';
import { BrowserWindow } from 'electron';
import { LocalStore } from './localStore'; // ✅ Use existing LocalStore

const execAsync = promisify(exec);

export interface WindowsPrinterCapabilities {
  printerId: string;
  printerName: string;
  displayName: string;
  capabilities: {
    supportsColor: boolean;
    supportsDuplex: boolean;
    paperSizes: string[];
    maxPaperSize: string;
    isDefault: boolean;
  };
  pricing: {
    bwPerPage: number;
    colorPerPage: number | null;
  };
  systemInfo: {
    os: string;
    hostname: string;
    driverVersion: string;
    model: string;
  };
  status: 'online' | 'offline' | 'error';
}

export class WindowsPrinterDetector {
  private window: BrowserWindow;
  private localStore: LocalStore; // ✅ Add LocalStore
  private cache: WindowsPrinterCapabilities[] | null = null;

  constructor(window: BrowserWindow, localStore: LocalStore) {
    this.window = window;
    this.localStore = localStore;
  }
  clearCache(): void {
    this.localStore.delete('printerCache');
    this.localStore.delete('printerFingerprint');
    this.cache = null;
    console.log('🗑️ Printer cache cleared');
  }
  async refreshPrinters(): Promise<WindowsPrinterCapabilities[]> {
    this.clearCache();
    return await this.getAllWindowsPrinters(true);
  }
  /**
   * ✅ OPTIMIZED: Check disk cache first, then query only if printers changed
   */
  async getAllWindowsPrinters(forceRefresh: boolean = false): Promise<WindowsPrinterCapabilities[]> {
    const startTime = Date.now();

    try {
      if (os.platform() !== 'win32') {
        console.warn('⚠️ Windows printer detection only works on Windows');
        return this.getFallbackPrinters();
      }

      // Get current printer list from Electron
      const electronPrinters = await this.window.webContents.getPrintersAsync();
      
      // ✅ Generate fingerprint of current printers
      const currentFingerprint = this.generatePrinterFingerprint(electronPrinters);
      
      // ✅ Load saved fingerprint and printer data from disk
      const savedFingerprint = this.localStore.get('printerFingerprint') as string || '';
      const savedPrinters = this.localStore.get('printerCache') as WindowsPrinterCapabilities[] || null;

      console.log(`📟 Found ${electronPrinters.length} printer(s)`);

      // ✅ If printers haven't changed, use disk cache
      if (!forceRefresh && savedPrinters && currentFingerprint === savedFingerprint) {
        console.log('⚡ Printers unchanged since last run - using saved data (0ms)');
        this.cache = savedPrinters;
        return savedPrinters;
      }

      // ✅ Printers changed - need to query PowerShell
      if (currentFingerprint !== savedFingerprint) {
        console.log('🆕 Printers changed or first run - querying capabilities...');
      } else {
        console.log('🔄 Force refresh requested...');
      }

      // Try batch query first
      let capabilitiesMap = await this.batchQueryAllPrinters(electronPrinters.map(p => p.name));
      
      // Fallback to sequential if batch failed
      if (Object.keys(capabilitiesMap).length === 0 && electronPrinters.length > 0) {
        console.log('⚠️ Batch query failed, falling back to sequential queries...');
        capabilitiesMap = await this.sequentialQueryPrinters(electronPrinters.map(p => p.name));
      }

      const windowsPrinters: WindowsPrinterCapabilities[] = [];

      for (const printer of electronPrinters) {
        try {
          const capabilities = capabilitiesMap[printer.name] || {
            color: this.detectColorFromName(printer.name),
            duplex: this.detectDuplexFromName(printer.name),
            paperSizes: ['A4', 'Letter']
          };

          const opts = printer.options as Record<string, any>;

          windowsPrinters.push({
            printerId: this.generatePrinterId(printer.name),
            printerName: printer.name,
            displayName: printer.displayName || printer.name,
            capabilities: {
              supportsColor: capabilities.color,
              supportsDuplex: capabilities.duplex,
              paperSizes: capabilities.paperSizes,
              maxPaperSize: capabilities.paperSizes[0] || 'A4',
              isDefault: printer.isDefault || false
            },
            pricing: {
              bwPerPage: capabilities.color ? 5 : 3,
              colorPerPage: capabilities.color ? 10 : null
            },
            systemInfo: {
              os: os.platform(),
              hostname: os.hostname(),
              driverVersion: this.extractDriverVersion(opts?.system_driverinfo || ''),
              model: opts?.['printer-make-and-model'] || 'Unknown'
            },
            status: this.mapStatus(printer.status)
          });
        } catch (err) {
          console.error(`❌ Failed to process ${printer.name}:`, err);
          windowsPrinters.push(this.createFallbackPrinter(printer));
        }
      }
    const printersWithEdits = this.applyEditedCapabilities(windowsPrinters);

      // ✅ Save to disk for next app launch
      this.cache = printersWithEdits;
      this.localStore.set('printerCache', printersWithEdits);
      this.localStore.set('printerFingerprint', currentFingerprint);

      const elapsed = Date.now() - startTime;
      console.log(`\n⚡ Detected ${windowsPrinters.length} printers in ${elapsed}ms (saved to disk)`);

      return printersWithEdits;
    } catch (error) {
      console.error('❌ Failed to detect Windows printers:', error);
      return this.getFallbackPrinters();
    }
  }

  /**
   * ✅ Generate fingerprint based on printer names and default status
   */
  private generatePrinterFingerprint(printers: any[]): string {
    const printerSignature = printers
      .map(p => `${p.name}|${p.isDefault ? '1' : '0'}`)
      .sort()
      .join('::');
    
    let hash = 0;
    for (let i = 0; i < printerSignature.length; i++) {
      const char = printerSignature.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    
    return hash.toString(36);
  }

  /**
   * ✅ Batch query all printers
   */
  private async batchQueryAllPrinters(printerNames: string[]): Promise<{
    [printerName: string]: {
      color: boolean;
      duplex: boolean;
      paperSizes: string[];
    }
  }> {
    try {
      console.log(`🔍 Batch querying ${printerNames.length} printers...`);

      const printerArray = printerNames
        .map(name => `'${name.replace(/'/g, "''")}'`)
        .join(', ');

      const psCommand = `
        $ErrorActionPreference = 'Continue'
        $printers = @(${printerArray})
        $results = @()
        
        foreach ($printerName in $printers) {
          try {
            $config = Get-PrintConfiguration -PrinterName $printerName -ErrorAction Stop
            
            $escapedName = $printerName.Replace('\\', '\\\\').Replace("'", "''")
            $wmi = Get-WmiObject -Query "SELECT PrinterPaperNames FROM Win32_Printer WHERE Name='$escapedName'" -Namespace "root\\cimv2" -ErrorAction SilentlyContinue
            
            $paperSizes = if ($wmi -and $wmi.PrinterPaperNames) { 
              ($wmi.PrinterPaperNames | Where-Object { $_ }) -join '|'
            } else { 
              'A4|Letter' 
            }
            
            $obj = New-Object PSObject -Property @{
              Name = $printerName
              Color = [bool]$config.Color
              Duplex = if ($config.DuplexingMode -eq 'OneSided') { $false } else { $true }
              PaperSizes = $paperSizes
            }
            
            $results += $obj
            Write-Host "OK: $printerName" -ForegroundColor Green
            
          } catch {
            Write-Host "SKIP: $printerName - $_" -ForegroundColor Yellow
          }
        }
        
        if ($results.Count -eq 0) {
          Write-Output '[]'
        } else {
          $results | Select-Object Name, Color, Duplex, PaperSizes | ConvertTo-Json -Depth 2
        }
      `;

      const { stdout } = await execAsync(
        `powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "${psCommand}"`,
        {
          timeout: 20000,
          windowsHide: true,
          encoding: 'utf8',
          maxBuffer: 5 * 1024 * 1024
        }
      );

      const lines = stdout.split('\n');
      let jsonStart = -1;
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith('[') || line.startsWith('{')) {
          jsonStart = i;
          break;
        }
      }

      if (jsonStart === -1) {
        console.error('❌ No JSON found in PowerShell output');
        return {};
      }

      const jsonText = lines.slice(jsonStart).join('\n').trim();
      
      if (!jsonText || jsonText === '[]') {
        console.warn('⚠️ Batch query returned empty array');
        return {};
      }

      let results = JSON.parse(jsonText);
      if (!Array.isArray(results)) {
        results = [results];
      }

      const capabilitiesMap: {
        [printerName: string]: {
          color: boolean;
          duplex: boolean;
          paperSizes: string[];
        }
      } = {};

      for (const result of results) {
        const rawSizes = result.PaperSizes.split('|').filter((s: string) => s && s.trim());
        const paperSizes = rawSizes
          .map((s: string) => this.normalizePaperSize(s))
          .filter((s: string | null) => s !== null) as string[];

        capabilitiesMap[result.Name] = {
          color: result.Color === true,
          duplex: result.Duplex === true,
          paperSizes: paperSizes.length > 0 ? paperSizes : ['A4', 'Letter']
        };

        console.log(`✅ ${result.Name} → Color: ${result.Color}, Duplex: ${result.Duplex}, Sizes: ${paperSizes.slice(0, 3).join(', ')}`);
      }

      return capabilitiesMap;

    } catch (error: any) {
      console.error('❌ Batch query error:', error.message);
      return {};
    }
  }

  private async sequentialQueryPrinters(printerNames: string[]): Promise<{
    [printerName: string]: {
      color: boolean;
      duplex: boolean;
      paperSizes: string[];
    }
  }> {
    const capabilitiesMap: {
      [printerName: string]: {
        color: boolean;
        duplex: boolean;
        paperSizes: string[];
      }
    } = {};

    for (const printerName of printerNames) {
      try {
        const capabilities = await this.querySinglePrinter(printerName);
        capabilitiesMap[printerName] = capabilities;
        console.log(`✅ ${printerName} → Color: ${capabilities.color}, Duplex: ${capabilities.duplex}`);
      } catch (error) {
        console.warn(`⚠️ Failed to query ${printerName}, using defaults`);
        capabilitiesMap[printerName] = {
          color: this.detectColorFromName(printerName),
          duplex: this.detectDuplexFromName(printerName),
          paperSizes: ['A4', 'Letter']
        };
      }
    }

    return capabilitiesMap;
  }

  private async querySinglePrinter(printerName: string): Promise<{
    color: boolean;
    duplex: boolean;
    paperSizes: string[];
  }> {
    const escapedName = printerName.replace(/'/g, "''");
    const psCommand = `Get-PrintConfiguration -PrinterName '${escapedName}' | Select-Object Color, DuplexingMode | ConvertTo-Json`;

    const { stdout } = await execAsync(
      `powershell.exe -Command "${psCommand}"`,
      { timeout: 5000, windowsHide: true, encoding: 'utf8' }
    );

    const result = JSON.parse(stdout.trim());

    return {
      color: result.Color === true,
      duplex: result.DuplexingMode   ,
      paperSizes: ['A4', 'Letter']
    };
  }

  private normalizePaperSize(size: string): string | null {
    const lowerSize = size.toLowerCase().trim();
    const sizeMap: { [key: string]: string } = {
      'letter': 'Letter', 'legal': 'Legal', 'a4': 'A4', 'a3': 'A3',
      'a5': 'A5', 'executive': 'Executive', 'tabloid': 'Tabloid',
      'ledger': 'Ledger', 'b4': 'B4', 'b5': 'B5'
    };

    if (sizeMap[lowerSize]) return sizeMap[lowerSize];
    for (const [key, value] of Object.entries(sizeMap)) {
      if (lowerSize.includes(key)) return value;
    }
    if (size.length > 1 && size.length < 30) return size;
    return null;
  }

  private getDefaultPaperSizes(): string[] {
    return ['A4', 'Letter', 'Legal'];
  }

  private detectColorFromName(name: string): boolean {
    const lowerName = name.toLowerCase();
    const bwKeywords = ['laserjet m1005', 'mono', 'monochrome', 'black only'];
    if (bwKeywords.some(kw => lowerName.includes(kw))) return false;
    const colorKeywords = ['color', 'colour', 'inkjet', 'photosmart', 'universal', 'pdf', 'onenote'];
    if (colorKeywords.some(kw => lowerName.includes(kw))) return true;
    return false;
  }

  private detectDuplexFromName(name: string): boolean {
    const lowerName = name.toLowerCase();
    return ['duplex', 'two-sided', 'double-sided'].some(kw => lowerName.includes(kw));
  }

  private generatePrinterId(printerName: string): string {
    return `printer_${printerName.replace(/[^a-zA-Z0-9]/g, '_')}`;
  }

  private extractDriverVersion(driverInfo: string): string {
    if (!driverInfo) return 'Unknown';
    const parts = driverInfo.split(';');
    return parts[1]?.trim() || 'Unknown';
  }

  private mapStatus(status?: number): 'online' | 'offline' | 'error' {
    if (status === undefined || status === 0) return 'online';
    if (status >= 1 && status < 10) return 'offline';
    return 'error';
  }
  saveEditedPrinter(printerId: string, capabilities: {
    supportsColor: boolean;
    supportsDuplex: boolean;
    paperSizes: string[];
  }): void {
    const edits = this.localStore.get('printerEdits') as any || {};
    edits[printerId] = capabilities;
    this.localStore.set('printerEdits', edits);
    
    // Update cache with edited values
    if (this.cache) {
      this.cache = this.cache.map(p => {
        if (p.printerId === printerId) {
          return {
            ...p,
            capabilities: {
              ...p.capabilities,
              ...capabilities
            }
          };
        }
        return p;
      });
    }
    
    console.log('💾 Saved edits for printer:', printerId);
  }

  /**
   * ✅ NEW: Apply saved edits when loading printers
   */
  private applyEditedCapabilities(printers: WindowsPrinterCapabilities[]): WindowsPrinterCapabilities[] {
    const edits = this.localStore.get('printerEdits') as any || {};
    
    return printers.map(printer => {
      if (edits[printer.printerId]) {
        return {
          ...printer,
          capabilities: {
            ...printer.capabilities,
            ...edits[printer.printerId]
          }
        };
      }
      return printer;
    });
  }

  private createFallbackPrinter(printer: any): WindowsPrinterCapabilities {
    const opts = printer.options as Record<string, any> || {};
    return {
      printerId: this.generatePrinterId(printer.name),
      printerName: printer.name,
      displayName: printer.displayName || printer.name,
      capabilities: {
        supportsColor: this.detectColorFromName(printer.name),
        supportsDuplex: this.detectDuplexFromName(printer.name),
        paperSizes: this.getDefaultPaperSizes(),
        maxPaperSize: 'A4',
        isDefault: printer.isDefault || false
      },
      pricing: {
        bwPerPage: this.detectColorFromName(printer.name) ? 5 : 3,
        colorPerPage: this.detectColorFromName(printer.name) ? 10 : null
      },
      systemInfo: {
        os: os.platform(),
        hostname: os.hostname(),
        driverVersion: this.extractDriverVersion(opts.system_driverinfo || ''),
        model: opts['printer-make-and-model'] || 'Unknown'
      },
      status: this.mapStatus(printer.status)
    };
  }

  private async getFallbackPrinters(): Promise<WindowsPrinterCapabilities[]> {
    const electronPrinters = await this.window.webContents.getPrintersAsync();
    return electronPrinters.map(p => this.createFallbackPrinter(p));
  }

  async getDefaultPrinter(): Promise<WindowsPrinterCapabilities | null> {
    const printers = await this.getAllWindowsPrinters();
    const defaultPrinter = printers.find(p => p.capabilities.isDefault);
    return defaultPrinter || (printers.length > 0 ? printers[0] : null);
  }
}
