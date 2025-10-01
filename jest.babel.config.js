// Jest-specific Babel configuration
// This file is only used by Jest for testing, not by Next.js
module.exports = {
    presets: [
        [
            'next/babel',
            {
                'preset-env': {
                    targets: {
                        node: 'current',
                    },
                },
            },
        ],
    ],
    plugins: [
        '@babel/plugin-transform-private-methods',
        '@babel/plugin-transform-class-properties',
        '@babel/plugin-transform-private-property-in-object'
    ],
    env: {
        test: {
            presets: [
                [
                    'next/babel',
                    {
                        'preset-env': {
                            targets: {
                                node: 'current',
                            },
                        },
                    },
                ],
            ],
        },
    },
};