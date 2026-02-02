import React from "react";
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';
import Button from '@material-ui/core/Button';
import Box from '@material-ui/core/Box';
import Switch from '@material-ui/core/Switch';
import FormControlLabel from '@material-ui/core/FormControlLabel';

import { useTranslation } from './common/LanguageContext';

export default function DataImportDialog(props) {
  const [busy, setBusy] = React.useState(false);
  const { t } = useTranslation();
  const [options, setOptions] = React.useState({
    skipError: true,
    createZones: false,
    replaceZones: false,
    ignoreNS: true,
    ignoreTTL: true,
  });

  function toggleSwitch(event) {
    const option  = event.target.name;
    const newBool = !options[option]
    setOptions(prevData => ({ ...prevData, [option]: newBool }));
  }

  function submit() {
    setBusy(true);
    props.onSubmit(options).then( result => {
      setBusy(false);
      props.onClose();
    } );
  }

  return (
    <Dialog open={props.open} onClose={props.onClose}>
      <DialogTitle>{t("importer.importOptions")}</DialogTitle>
      <DialogContent>
        { props.type === 'records' && (
          <>
            <Box>
              <FormControlLabel
                control={<Switch checked={options.createZones} name="createZones" onChange={toggleSwitch} color="primary" disabled />}
                label={t("importer.autoCreateZones")}
              />
            </Box>
            <Box>
              <FormControlLabel
                control={<Switch checked={options.ignoreNS} name="ignoreNS" onChange={toggleSwitch} color="primary" />}
                label={t("importer.ignoreNs")}
              />
            </Box>
            <Box>
              <FormControlLabel
                control={<Switch checked={options.ignoreTTL} name="ignoreTTL" onChange={toggleSwitch} color="primary" />}
                label={t("importer.ignoreTtl")}
              />
            </Box>
          </>
        ) }
        { props.type === 'zones' && (
          <Box>
            <FormControlLabel
              control={<Switch checked={options.replaceZones} name="replaceZones" onChange={toggleSwitch} color="primary" />}
              label={t("importer.replaceZones")}
            />
          </Box>
        ) }
        <Box>
          <FormControlLabel
            control={<Switch checked={options.skipError} name="skipError" onChange={toggleSwitch} color="primary" />}
            label={t("importer.skipErrors")}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button disabled={busy} onClick={props.onClose}>{t("app.cancel")}</Button>
        <Button disabled={busy} onClick={submit}>{t("importer.startImport")}</Button>
      </DialogActions>
    </Dialog>
  );
}
