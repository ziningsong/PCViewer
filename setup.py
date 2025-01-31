from setuptools import setup, find_packages
import os

# 读取 README.md 的内容（避免编码问题）
with open("README.md", "r", encoding="utf-8") as f:
    long_description = f.read()

setup(
    name="pcviewer",
    version="0.1.1",
    author="laowoniu",
    author_email="songzn@shanghaitech.edu.cn",
    description="A simple tool for visualizing point cloud sequences",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/ziningsong/PCViewer",
    packages=find_packages(),
    include_package_data=True,
    package_data={
        "pcviewer": [
            "static/*",
            "static/js/*",
        ]
    },
    install_requires=[
        "numpy>=1.19.0",
        "websockets>=10.0",
        "aiohttp>=3.8.0",
        "torch>=1.10.0",
    ],
    classifiers=[
        "Programming Language :: Python :: 3",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
    ],
    python_requires='>=3.7',
)