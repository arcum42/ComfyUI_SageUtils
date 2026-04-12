/**
 * LLM React Pilot Entry Point
 *
 * Option 2 scaffold: this module is the integration boundary for the React
 * implementation of the LLM tab.
 */

export async function createLLMTabReactPilot(container, context = {}) {
    const { fallback } = context;

    if (typeof fallback !== 'function') {
        throw new Error('LLM React pilot requires a fallback factory function');
    }

    const React = globalThis?.React;
    const ReactDOM = globalThis?.ReactDOM;
    const createRoot = ReactDOM?.createRoot;

    // Safe default: if React runtime is not present in host environment,
    // use the proven vanilla path.
    if (!React || !createRoot) {
        console.info('[LLM React Pilot] React runtime unavailable; using vanilla LLM tab fallback.');
        container.dataset.llmPilotMode = 'fallback';
        return await fallback(container, { pilotMode: 'fallback' });
    }

    console.info('[LLM React Pilot] React runtime available; mounting pilot shell.');
    container.dataset.llmPilotMode = 'on';

    container.innerHTML = '';

    const rootHost = document.createElement('div');
    rootHost.className = 'llm-react-pilot-root';
    container.appendChild(rootHost);

    let vanillaMountEl = null;

    const PilotShell = () => React.createElement(
        'div',
        {
            className: 'llm-react-pilot-shell',
            style: {
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                minHeight: 0
            }
        },
        React.createElement(
            'div',
            {
                className: 'llm-react-pilot-banner',
                style: {
                    alignSelf: 'flex-end',
                    margin: '8px 10px 2px 0',
                    padding: '3px 8px',
                    borderRadius: '10px',
                    fontSize: '11px',
                    fontWeight: '600',
                    letterSpacing: '0.2px',
                    background: '#1f3d2a',
                    border: '1px solid #2f8f55',
                    color: '#b7f5d0'
                }
            },
            'React Pilot: ON'
        ),
        React.createElement(
            'div',
            {
                className: 'llm-header',
                role: 'banner'
            },
            React.createElement(
                'h2',
                {
                    className: 'llm-title',
                    id: 'llm-tab-title',
                    'aria-label': 'LLM Chat Interface'
                },
                'LLM Chat'
            ),
            React.createElement(
                'p',
                {
                    className: 'llm-description'
                },
                'Chat with language models using Ollama or LM Studio'
            )
        ),
        React.createElement('div', {
            className: 'llm-react-pilot-vanilla-host',
            style: {
                flex: '1 1 auto',
                minHeight: 0
            },
            ref: (node) => {
                vanillaMountEl = node;
            }
        })
    );

    const root = createRoot(rootHost);
    root.render(React.createElement(PilotShell));

    if (!vanillaMountEl) {
        await new Promise((resolve) => requestAnimationFrame(resolve));
    }

    if (!vanillaMountEl) {
        root.unmount();
        throw new Error('LLM React pilot failed to create vanilla host node');
    }

    const vanillaHandle = await fallback(vanillaMountEl, { pilotMode: 'embedded' });

    // M3 incremental extraction: React shell owns the header while the rest of
    // the legacy tab remains embedded for behavior parity.
    const embeddedHeader = vanillaMountEl.querySelector('.llm-header');
    if (embeddedHeader) {
        embeddedHeader.style.display = 'none';
    }

    let unmounted = false;
    const unmount = () => {
        if (unmounted) {
            return;
        }
        unmounted = true;

        try {
            if (typeof vanillaHandle === 'function') {
                vanillaHandle();
            } else if (typeof vanillaHandle?.unmount === 'function') {
                vanillaHandle.unmount();
            } else if (typeof vanillaHandle?.destroy === 'function') {
                vanillaHandle.destroy();
            }
        } finally {
            root.unmount();
        }
    };

    return {
        unmount,
        destroy: unmount
    };
}
