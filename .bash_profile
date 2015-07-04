if [ -d "$HOME/perl/perl-5.22/bin" ] ; then
  NP="$HOME:$HOME/perl/perl-5.22/bin::$HOME/java/apache-ant-1.9.6/bin"
  export PATH=$NP${PATH:+:$PATH}
fi
if [ -d "$HOME/packages/usr/bin" ] ; then
  NP="$HOME/packages/usr/bin"
  export PATH=$NP${PATH:+:$PATH}
fi
if [ -d "$HOME/packages/usr/lib" ] ; then
  NP="$HOME/packages/usr/lib"
  export LD_LIBRARY_PATH=$NP${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}
  export LDFLAGS=$NP${LDFLAGS:+:$LDFLAGS}
fi
if [ -d "$HOME/packages/usr/include" ] ; then
  NP="$HOME/packages/usr/include"
  export C_INCLUDE_PATH=$NP${C_INCLUDE_PATH:+:$C_INCLUDE_PATH}
  export CPLUS_INCLUDE_PATH=$NP${CPLUS_INCLUDE_PATH:+:$CPLUS_INCLUDE_PATH}
  export CFLAGS=$NP${CFLAGS:+:$CFLAGS}
fi
if [ -d "$HOME/w3config" ] ; then
  export W3C_VALIDATOR_CFG="$HOME/w3config/validator.conf"
fi
export VAL_CFG_COMPLETE="1";


