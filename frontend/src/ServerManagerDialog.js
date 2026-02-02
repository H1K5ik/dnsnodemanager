import React, { useState, useRef, useEffect } from "react";
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';
import TextField from '@material-ui/core/TextField';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Switch from '@material-ui/core/Switch';
import Button from '@material-ui/core/Button';

import { useTranslation } from './common/LanguageContext';

function FullTextField(props) {
  return <TextField fullWidth variant="outlined" margin="dense" {...props} />;
}

const defaultData = {
  dns_ip: "",
  dns_fqdn: "",
  name: "",
  managed: true,
  ssh_host: "",
  ssh_user: "",
  ssh_pass: "",
  config_path: "/etc/bind/managed",
};

export default function ServerManagerDialog(props) {
  const { open = false, new: isNew = false, toggleFunc, onSubmit, data = defaultData } = props;
  const [isBusy, setBusy] = useState(false);
  const [isManaged, setManaged] = useState(Boolean(data.managed));
  const dataRef = useRef({ ...data, managed: Boolean(data.managed) });

  useEffect(() => {
    dataRef.current = { ...data, managed: Boolean(data.managed) };
    setManaged(Boolean(data.managed));
  }, [data, open]);

  const { t } = useTranslation();

  const handleInputChange = (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    dataRef.current[event.target.name] = value;
    if (event.target.name === 'managed') setManaged(value);
  };

  const submitForm = () => {
    setBusy(true);
    onSubmit(dataRef.current).finally(() => setBusy(false));
  };

  const pressKey = (event) => {
    if (event.key === 'Enter') submitForm();
  };

  const d = dataRef.current;
  return (
    <Dialog open={open} onClose={toggleFunc} onKeyPress={pressKey}>
      <DialogTitle>{ isNew ? t('servers.addServerTitle') : t('servers.editServer') }</DialogTitle>
      <DialogContent>
        <FullTextField autoFocus required name="name" label={t('servers.serverName')} helperText={t('servers.serverNameHelper')} defaultValue={d.name} onChange={handleInputChange} />
        <FullTextField required name="dns_ip" label={t('servers.ipAddress')} defaultValue={d.dns_ip} onChange={handleInputChange} />
        <FullTextField required name="dns_fqdn" label={t('servers.nsFqdn')} helperText={t('servers.nsFqdnHelper')} defaultValue={d.dns_fqdn} onChange={handleInputChange} />
        <FormControlLabel control={<Switch checked={isManaged} name="managed" onChange={handleInputChange} color="primary" />} label={t('servers.managedServer')} />
        { isManaged && <>
          <FullTextField name="ssh_host" label={t('servers.sshHost')} defaultValue={d.ssh_host} onChange={handleInputChange} />
          <FullTextField name="ssh_user" label={t('servers.sshUser')} defaultValue={d.ssh_user} onChange={handleInputChange} />
          <FullTextField name="ssh_pass" label={t('servers.sshPass')} type="password" helperText={t('servers.sshPassHelper')} defaultValue={d.ssh_pass} onChange={handleInputChange} />
          <FullTextField name="config_path" label={t('servers.configPath')} helperText={t('servers.configPathHelper')} defaultValue={d.config_path} onChange={handleInputChange} />
        </> }
      </DialogContent>
      <DialogActions>
        <Button disabled={isBusy} onClick={toggleFunc}>{t('app.cancel')}</Button>
        <Button disabled={isBusy} onClick={submitForm}>{ isNew ? t('servers.addServer') : t('servers.saveChanges') }</Button>
      </DialogActions>
    </Dialog>
  );
}
