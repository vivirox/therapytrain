#!/usr/bin/env bash

_viewctl_completions() {
    local cur prev opts
    COMPREPLY=()
    cur="${COMP_WORDS[COMP_CWORD]}"
    prev="${COMP_WORDS[COMP_CWORD-1]}"
    opts="start stop dashboard restart update pull ps stats cleanup logs -cpu -h --help -y -v --version"

    case "${prev}" in
        viewctl)
            COMPREPLY=( $(compgen -W "${opts}" -- "${cur}") )
            return 0
            ;;
        cleanup)
            COMPREPLY=( $(compgen -W "-a" -- "${cur}") )
            return 0
            ;;
        *)
            ;;
    esac

    COMPREPLY=( $(compgen -W "${opts}" -- "${cur}") )
    return 0
}

if [[ -n ${ZSH_VERSION-} ]]; then
    autoload -U +X bashcompinit && bashcompinit
    autoload -U +X compinit && compinit
fi

complete -F _viewctl_completions viewctl