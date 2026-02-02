import React from "react";
import Box from '@material-ui/core/Box';
import Select from '@material-ui/core/Select';
import FormControl from '@material-ui/core/FormControl';
import InputLabel from '@material-ui/core/InputLabel';
import MenuItem from '@material-ui/core/MenuItem';

import { useTranslation } from './common/LanguageContext';

function CodeBlock(props) {
  const css = {
    margin: "1em",
    padding: "1.5em",
    backgroundColor: "#444",
    fontFamily: "Monospace",
    color: "#eee",
    whiteSpace: "pre-line",
  };
  return <Box style={css}>{props.children}</Box>;
}

export default function ServerManagerGuide(props) {
  const [dist, setDist] = React.useState('debian');
  const { t } = useTranslation();

  function handleDistChange(event) {
    setDist(event.target.value);
  }

  function getUser() {
    return dist === 'rhel' ? 'named' : 'bind';
  }

  return (
    <>
      <FormControl variant="outlined">
        <InputLabel>{t('guide.linuxFamily')}</InputLabel>
        <Select defaultValue={dist} onChange={handleDistChange} label={t('guide.linuxFamily')}>
          <MenuItem value="debian">{t('guide.debian')}</MenuItem>
          <MenuItem value="rhel">{t('guide.rhel')}</MenuItem>
        </Select>
      </FormControl>
      <p>{t('guide.intro')}</p>
      <p>{t('guide.addUser')}</p>
      <CodeBlock>useradd -m -G {getUser()} dnsmanager</CodeBlock>
      <p>{t('guide.optionalPass')}</p>
      <CodeBlock>passwd dnsmanager</CodeBlock>
      <p>{t('guide.createDir')}</p>
      <CodeBlock>
        mkdir --mode=775 /etc/{getUser()}/managed<br />
        chown dnsmanager:{getUser()} /etc/{getUser()}/managed
      </CodeBlock>
      <p>{t('guide.installKey')}</p>
      <CodeBlock>
        su dnsmanager<br />
        mkdir --mode=700 ~/.ssh<br />
        vi ~/.ssh/authorized_keys
        chmod 600 ~/.ssh/authorized_keys
      </CodeBlock>
      <p>{t('guide.addServer')}</p>
      <p>{t('guide.firewall')}</p>
      <p>{t('guide.includeFile')}</p>
    </>
  );
}
