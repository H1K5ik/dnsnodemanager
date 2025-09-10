import React from "react";
import Box from '@material-ui/core/Box';
import Select from '@material-ui/core/Select';
import FormControl from '@material-ui/core/FormControl';
import InputLabel from '@material-ui/core/InputLabel';
import MenuItem from '@material-ui/core/MenuItem';

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

  function handleDistChange(event) {
    setDist(event.target.value);
  }

  function getUser() {
    return dist === 'rhel' ? 'named' : 'bind';
  }

  return (
    <>
      <FormControl variant="outlined">
        <InputLabel>Linux Family</InputLabel>
        <Select defaultValue={dist} onChange={handleDistChange} label="Linux Family">
          <MenuItem value="debian">Debian / Ubuntu</MenuItem>
          <MenuItem value="rhel">RHEL / CentOS</MenuItem>
        </Select>
      </FormControl>
      <p>These are the recommended steps to prepare managed dns servers for configuration sync</p>
      <p>Add a new user on the dns server, which is a member of the bind group</p>
      <CodeBlock>useradd -m -G {getUser()} dnsmanager</CodeBlock>
      <p>Optionally set a password</p>
      <CodeBlock>passwd dnsmanager</CodeBlock>
      <p>Create a directory for configuration files that is owned by the new user and the bind group and writable by both. You can freely choose the directory path, but keep in mind that SELinux or AppArmor may restrict you to use some subpath of the default config location.</p>
      <CodeBlock>
        mkdir --mode=775 /etc/{getUser()}/managed<br />
        mkdir --mode=775 /etc/{getUser()}/managed/zones<br />
        chown dnsmanager:{getUser()} /etc/{getUser()}/managed<br />
        chown dnsmanager:{getUser()} /etc/{getUser()}/managed/zones
      </CodeBlock>
      <p>Install the ssh key to the users authorized_keys file. Use the SSH KEY INFO button to retrieve the key from DnsNM.</p>
      <CodeBlock>
        su dnsmanager<br />
        mkdir --mode=700 ~/.ssh<br />
        vi ~/.ssh/authorized_keys
        chmod 600 ~/.ssh/authorized_keys
      </CodeBlock>
      <p>Now you can add the server to the server manager.</p>
      <p>Make sure that the DnsNM host can connect to your managed DNS nodes and login through ssh. Consider firewall restrictions, tcpwrappers and user/group restrictions in sshd_config.</p>
      <p>After the first configuration sync, <b>include the deployed file (managedconfig.conf) in your main named.conf</b> file.</p>
      <p><b>Note:</b> Zone files will be automatically created in the <code>/etc/{getUser()}/managed/zones/</code> directory. The system will create this directory automatically if it doesn't exist.</p>
    </>
  );
}
