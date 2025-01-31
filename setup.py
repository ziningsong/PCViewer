from setuptools import setup, find_packages
import os

# 读取static目录下的所有文件
def package_files(directory):
    paths = []
    for (path, directories, filenames) in os.walk(directory):
        for filename in filenames:
            paths.append(os.path.join('..', path, filename))
    return paths

static_files = package_files('pcviewer/static')

setup(
    name="pcviewer",
    version="0.1.0",
    author="laowoniu",
    author_email="songzn@shanghaitech.edu.cn",
    description="A simple tool for visualizing point cloud sequences",
    long_description=open('README.md').read(),
    long_description_content_type="text/markdown",
    url="https://github.com/ziningsong/PCViewer",
    packages=find_packages(),
    package_data={
        'pcviewer': static_files,
    },
    install_requires=[
        "numpy>=1.19.0",
        "websockets>=10.0",
        "aiohttp>=3.8.0"
    ],
    classifiers=[
        "Programming Language :: Python :: 3",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
    ],
    python_requires='>=3.7',
)
