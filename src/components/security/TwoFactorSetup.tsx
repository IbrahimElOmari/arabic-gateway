import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { QRCodeSVG } from 'qrcode.react';
import { useTwoFactor } from '@/hooks/use-two-factor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Shield, ShieldCheck, ShieldOff, Copy, Check, AlertTriangle, Key } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function TwoFactorSetup() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { status, loading, setupData, setup, verify, disable, useBackupCode } = useTwoFactor();
  
  const [step, setStep] = useState<'initial' | 'setup' | 'verify' | 'backup'>('initial');
  const [code, setCode] = useState('');
  const [backupCode, setBackupCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedCodes, setCopiedCodes] = useState(false);
  const [showDisableDialog, setShowDisableDialog] = useState(false);
  const [disableCode, setDisableCode] = useState('');

  const handleSetup = async () => {
    const data = await setup();
    if (data) {
      setStep('setup');
    }
  };

  const handleVerify = async () => {
    setVerifying(true);
    const success = await verify(code);
    setVerifying(false);
    
    if (success) {
      toast({
        title: t('security.twoFactor.enabled'),
        description: t('security.twoFactor.enabledDescription'),
      });
      setStep('backup');
    } else {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: t('security.twoFactor.invalidCode'),
      });
    }
  };

  const handleDisable = async () => {
    const success = await disable(disableCode);
    if (success) {
      toast({
        title: t('security.twoFactor.disabled'),
      });
      setShowDisableDialog(false);
      setDisableCode('');
      setStep('initial');
    } else {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: t('security.twoFactor.invalidCode'),
      });
    }
  };

  const handleUseBackup = async () => {
    setVerifying(true);
    const success = await useBackupCode(backupCode);
    setVerifying(false);
    
    if (success) {
      toast({
        title: t('security.twoFactor.backupUsed'),
      });
      setBackupCode('');
    } else {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: t('security.twoFactor.invalidBackupCode'),
      });
    }
  };

  const copyToClipboard = async (text: string, type: 'secret' | 'codes') => {
    await navigator.clipboard.writeText(text);
    if (type === 'secret') {
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    } else {
      setCopiedCodes(true);
      setTimeout(() => setCopiedCodes(false), 2000);
    }
  };

  if (loading) {
    return <div className="animate-pulse h-48 bg-muted rounded-lg" />;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle>{t('security.twoFactor.title')}</CardTitle>
          </div>
          {status.isEnabled ? (
            <Badge variant="default" className="bg-green-600">
              <ShieldCheck className="h-3 w-3 mr-1" />
              {t('security.twoFactor.enabled')}
            </Badge>
          ) : status.isRequired ? (
            <Badge variant="destructive">
              <AlertTriangle className="h-3 w-3 mr-1" />
              {t('security.twoFactor.required')}
            </Badge>
          ) : (
            <Badge variant="secondary">
              <ShieldOff className="h-3 w-3 mr-1" />
              {t('security.twoFactor.disabled')}
            </Badge>
          )}
        </div>
        <CardDescription>{t('security.twoFactor.description')}</CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {status.isRequired && !status.isEnabled && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {t('security.twoFactor.requiredWarning')}
            </AlertDescription>
          </Alert>
        )}

        {!status.isEnabled && step === 'initial' && (
          <Button onClick={handleSetup} className="w-full">
            <Shield className="h-4 w-4 mr-2" />
            {t('security.twoFactor.setup')}
          </Button>
        )}

        {step === 'setup' && setupData && (
          <div className="space-y-4">
            <Alert>
              <AlertDescription>
                {t('security.twoFactor.scanQR')}
              </AlertDescription>
            </Alert>
            
            <div className="flex justify-center p-4 bg-white rounded-lg">
              <QRCodeSVG value={setupData.qrCodeUrl} size={200} />
            </div>
            
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                {t('security.twoFactor.manualEntry')}
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 p-2 bg-muted rounded text-sm break-all">
                  {setupData.secret}
                </code>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(setupData.secret, 'secret')}
                >
                  {copiedSecret ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                {t('security.twoFactor.enterCode')}
              </label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                  className="font-mono text-center text-lg tracking-widest"
                />
                <Button onClick={handleVerify} disabled={code.length !== 6 || verifying}>
                  {verifying ? t('common.loading') : t('common.verify')}
                </Button>
              </div>
            </div>
          </div>
        )}

        {step === 'backup' && setupData && (
          <div className="space-y-4">
            <Alert>
              <Key className="h-4 w-4" />
              <AlertDescription>
                {t('security.twoFactor.saveBackupCodes')}
              </AlertDescription>
            </Alert>
            
            <div className="grid grid-cols-2 gap-2 p-4 bg-muted rounded-lg">
              {setupData.backupCodes.map((backupCodeItem, index) => (
                <code key={index} className="text-sm font-mono p-1 bg-background rounded">
                  {backupCodeItem}
                </code>
              ))}
            </div>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => copyToClipboard(setupData.backupCodes.join('\n'), 'codes')}
            >
              {copiedCodes ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
              {t('security.twoFactor.copyBackupCodes')}
            </Button>

            <Button onClick={() => setStep('initial')} className="w-full">
              {t('common.done')}
            </Button>
          </div>
        )}

        {status.isEnabled && (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <span className="text-sm">
                {t('security.twoFactor.backupCodesRemaining', { 
                  count: status.backupCodesRemaining 
                })}
              </span>
            </div>

            {!status.isRequired && (
              <Dialog open={showDisableDialog} onOpenChange={setShowDisableDialog}>
                <DialogTrigger asChild>
                  <Button variant="destructive" className="w-full">
                    <ShieldOff className="h-4 w-4 mr-2" />
                    {t('security.twoFactor.disable')}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t('security.twoFactor.disableTitle')}</DialogTitle>
                    <DialogDescription>
                      {t('security.twoFactor.disableDescription')}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Input
                      type="text"
                      value={disableCode}
                      onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="000000"
                      maxLength={6}
                      className="font-mono text-center text-lg tracking-widest"
                    />
                    <Button
                      variant="destructive"
                      className="w-full"
                      onClick={handleDisable}
                      disabled={disableCode.length !== 6}
                    >
                      {t('security.twoFactor.confirmDisable')}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
